
/* For timing functions */
const { performance } = require("perf_hooks");

/* PostgreSQL API */
const { Client } = require("pg");

// @ts-ignore
const chalk = require("chalk");

// @ts-ignore
const slugify = require("slugify");

const Logger = require("../util/logger");

const log = new Logger("sql");


const SQLResult = require("./sql/result");
const MatchTable = require("./sql/match");
const UserTable = require("./sql/user");

const { getRoundWins, getMatchPoint } = require("../util/matchutils");

/**
 * A PostgreSQL Database.
 *
 */
class SQLDatabase {

	/**
	 * Configures a SQL Database.
	 *
	 * @param {string} uri The URI to the PostgreSQL database
	 */
	constructor(uri = process.env.DATABASE_URL) {

		super();

		if(!uri) {

			log.warn("ev 'DATABASE_URL' is missing! any database calls will throw an error.");
		}

		/**
		 * @type {Logger}
		 */
		this.log = log;

		/**
		 * The database URI to use.
		 *
		 * @private
		 * @member {string}
		 * @readonly
		 */
		this.uri = uri;

		/**
		 * Whether the connection is closed or not.
		 *
		 * @member {boolean}
		 */
		this.isConnected = false;

		/**
		 * The currently used client.
		 *
		 * @private
		 * @member {pg.Client}
		 */
		this.client;

		/**
		 * A cache of uuids to users for faster queries
		 *
		 * @member {Map<string, User>}
		 */
		this.userCache = new Map();

		this.set = new MatchTable(this);

		this.user = new UserTable(this);

		/* create match table */
		this.query(`
			CREATE TABLE IF NOT EXISTS matchs(
				id serial PRIMARY KEY,

				game integer DEFAULT null,

				users   UUID[],
				winners UUID[]
			);
		`);

		/* create set table */
		this.query(`
			CREATE TABLE IF NOT EXISTS setes(
				id     serial PRIMARY KEY,

				tournament   integer DEFAULT null,

				num_matchs integer DEFAULT 0,
				matchs     integer[],

				users      UUID[],
				winners    UUID[]
			);
		`);
	}

	async open() {
		if(!this.isConnected) {
			this.client = new Client({
				connectionString: process.env.DATABASE_URL,
				ssl: true
			});

			await this.client.connect();
			this.isConnected = true;
		} else {
			log.warn("tried to open a connection that was already open");
		}
	}

	async close() {
		if(this.isConnected && this.client != null) {
			this.client.end();
			this.isConnected = false;
		} else {
			log.warn("tried to close a connection that was already closed");
		}
	}

	async openSilently() {
		if(!this.isConnected) { await this.open(); }
	}

	/**
	 * Opens a connection to the SQL database, closes it, then returns.
	 */
	async test() {

		await this.openSilently();
		await this.close();
	}

	/**
	 * The result of a successful query.
	 *
	 * @external QueryResult
	 * @see {@link https://node-postgres.com/api/result}
	 */

	/**
	 * Executes a query. Not recommended for user input due to SQL injection.
	 *
	 * @param {string} statement the query to run
	 *
	 * @returns {Promise<SQLResult>} the result of the query if successful
	 */
	async query(statement) {

		await this.openSilently();

		let result = await this.client.query(statement);
		return new SQLResult(this, result);
	}

	/**
	 * Executes a parameterized query.
	 *
	 * @param {string} statement the query to run
	 * @param {Array}  values    the arguments to use in the query
	 *
	 * @returns {Promise<SQLResult>} the result of the query if successful
	 */
	async pquery(statement, values) {

		await this.openSilently();
		let result = await this.client.query(statement, values);
		return new SQLResult(this, result);
	}

	//==========================================================================
	// USER QUERIES
	//==========================================================================
	
	/** @override */
	async addUser(name, dscr) { return this.user.addUser(name, dscr); }

	/** @override */
	async loadUser(tag) { return this.user.loadUser(tag); }

	/**
	 * @override
	 * @inheritdoc
	 *
	 * @param {string[]} ids
	 *
	 * @returns {Promise<User[]>}
	 */
	async loadUsersByID(...ids) { return this.user.loadUsersByID(ids); }

	/** @override */
	async searchUsers(partial) {

		const statement = `
			SELECT * FROM users
			WHERE LOWER(name) LIKE '%' || $1 || '%'
		`;

		var res = await this.pquery(statement, [ partial.toLowerCase() ]);

		return res.toUsers();
	}

	/** @override */
	async linkUser(uuid, options) {

		if(!options) {

			throw new Error("options for linkUser not provided");
		}

		if(!options.discord_id) {

			throw new Error("discord id not provided");
		}

		let discord_id = options.discord_id;

		const statement = `
			UPDATE users
			SET discord_id = $1
			WHERE uuid = $2
			RETURNING discriminator, name;
		`;

		var res = await this.pquery(statement, [discord_id, uuid]);

		if(res.rows.length > 0) {
			
			let row = res.rows[0];
			let tag = row.name + "#" + row.discriminator;
			log.info(`linked user ${ tag.green } to discord id ${ discord_id.green }`);

			return this.loadUsersByID(uuid)[0];

		} else {

			throw new Error("this user does not exist (uuid = " + uuid + ")");
		}
	}

	/** @override */
	async getUserByLink(options) {

		if(!options) {

			throw new Error("parameter must be an object");
		}

		const q = "SELECT * FROM users WHERE discord_id=$1;";

		let res = await this.pquery(q, [ options.discord ]);

		return res.toUser();
	}

	/**
	 * Flags a user as verified.
	 */
	verifyUser(uuid) {
		const statement = `
		UPDATE users
		SET verified = true
		WHERE uuid=$1
		`;

		return this.pquery(statement, [uuid]);
	}

	//==========================================================================
	// MATCH / ROUND QUERIES
	//==========================================================================

	/** @override */
	async openMatchSet(mb) {
		const q = `
			INSERT INTO setes(users, num_matchs) VALUES ($1, $2)
			RETURNING *;
		`;

		var res = await this.pquery(q, [mb.users.map(user => user.uuid), mb.num_matchs]);
		log.info(`opened new set #${ res.rows[0].id }`);

		return parseInt(res.rows[0].id);
	}

	/**
	 * Inserts a match into a set in progress.
	 *
	 * @param {Object} options             Information about the match.
	 * @param {User[]} options.users       The users involved in the match.
	 * @param {User[]} options.winners     The winners of the match.
	 * @param {Object} [options.meta = {}] Metainfo about the match.
	 *
	 * @returns {Promise<MatchSet>} The match that was created.
	 */
	async addMatch(options) {

		var id; // ID of the added match

		const q = `
			INSERT INTO matchs(users, winners) VALUES ($1, $2)
			RETURNING *;
		`;

		let user_uuids = options.users.map(user => user.id);
		let winr_uuids = options.winners.map(user => user.id);

		let res = await this.pquery(q, [user_uuids, winr_uuids]);
		log.info(`added match #${ id }`);

		return new MatchSet(id, {
			users: options.users,
			meta: {}
		});
	}

	/**
	 * Updates a set with information from a MatchSetBuilder
	 *
	 * param {MatchSetBuilder} mb The set builder.
	 */
	//async updateMatchSet(mb) {

	//    const q = `
	//        UPDATE setes
	//        SET winners     = $1,
	//            matchs      = $2,
	//            in_progress = $3
	//        WHERE id = $4
	//    `;

	//    if(mb.id != null) {

	//        await this.pquery(q, [mb.winners.map(u => u.uuid), mb.matchs.map(r => r.id), mb.in_progress, mb.id]);

	//        if(mb.in_progress) {
	//            log.info(`updated set #${ mb.id }`);
	//            return null;
	//        } else {
	//            var m = mb.getMatchSet();
	//            log.info(
	//                chalk.green(`completed set #${ m.id } (rids: ${ m.matchs.map(r => r.id) }): `) +
	//                `${ m.users[0].tagc } ` +
	//                chalk.yellow(`(${ m.getMatchWins(m.users[0]) } - ${ m.getMatchWins(m.users[1]) }) `) +
	//                `${ m.users[1].tagc }`
	//            );
	//        }
	//    }
	//}

	/**
	 * Retrieves matchs by their ID from the database.
	 *
	 * @param {number[]} ids The IDs of the matchs to retrieve.
	 *
	 * @returns {Promise<Match>} The matchs that was retrieved.
	 */
	async getMatch(ids) {

		let t1 = performance.now();

		var single = false;

		if(!Array.isArray(ids)) {
			
			single = true;
			ids = [ids];
		}
		const q = "SELECT * FROM matchs WHERE id = ANY($1)";
		let res = await this.pquery(q, [ids]);
		let refs = res.rows;
		
		log.info(`read matchs ${ ids } in ${ performance.now() - t1 }ms`);

		// convert references into matchs
		let matchs = Promise.all(refs.map(r => Match.load(r)));

		log.info(`loaded matchs ${ ids } in ${ performance.now() - t1 }ms`);

		return (single ? (await matchs)[0] : matchs);
	}

	/**
	 * Gets a set from the database by the set ID.
	 *
	 * @param {number} id The ID of the set to get.
	 *
	 * @returns {Promise<MatchSet>} The retrieved set.
	 */
	async getMatchSet(id) {
		
		const q = "SELECT * FROM setes WHERE id=$1";

		let res = await this.pquery(q, [id]);

		if(res.rows.length == 0) {

			throw new Error(`set #${ id } does not exist`);
		}
		else {

			return await MatchSet.load(res.rows[0]);
		}
	}

	/**
	 * Gets all setes from the database.
	 *
	 * @returns {MatchSet[]} An array of setes.
	 */
	async getAllMatchSetes() {

		const q = "SELECT * FROM setes";

		var res = await this.query(q);

		let rows = res.rows.filter(row => !row.in_progress);

		let setes = [];
		for(let row of rows) {
			setes.push(await MatchSet.load(row));
		}

		return setes;
	}

	/**
	 * Writes a set into the database.
	 */
	async addMatchSet(set) {
		const match_query = `
			INSERT INTO matchs(users, winners) VALUES ($1, $2)
			RETURNING *;
		`;

		const set_query = `
			INSERT INTO setes(users, winners, matchs, num_matchs) VALUES ($1, $2, $3, $4)
			RETURNING *;
		`;

		var match_ids = [];
		for(let i = 0; i < set.matchs.length; i++) {

			let match = set.matchs[i];
			let user_uuids = match.users.map(user => user.uuid);
			let winr_uuids = match.winners.map(user => user.uuid);

			let res = await this.pquery(match_query, [user_uuids, winr_uuids]);
			match_ids.push(parseInt(res.rows[0].id));
		}

		let res = await this.pquery(set_query, [
			set.users.map(user => user.uuid),
			set.winners.map(user => user.uuid),
			match_ids,
			set.num_matchs
		]);

		let set_id = res.rows[0].id;

		log.info(
			chalk.green(`added set #${ set_id } (rids: ${ match_ids }): `) +
			`${ set.users[0].tagc } ` +
			chalk.yellow(`(${ set.getMatchWins(set.users[0]) } - ${ set.getMatchWins(set.users[1]) }) `) +
			`${ set.users[1].tagc }`
		);
	}

	//==========================================================================
	// TOURNAMENT QUERIES
	//==========================================================================

	/**
	 * Creates the tournament table if one doesn't already exist.
	 *
	 * @private
	 */
	async _initTournamentTable() {
		// id: The ID of the tournament. Used as the PK and for other tables to use for referencing.
		// title: The fancy title of the tournament.
		// gametype: The ID of the gametype to use. This will decide most
		//           default set rules as well as what metainfo will be required.
		// open_time: The time that this tournament will open. (can be null)
		// close_time: The time that this tournament will close. (can be null)
		// users: The users that are entered into this tournament.
		await this.query(`
			CREATE TABLE IF NOT EXISTS tournaments (
				id         serial PRIMARY KEY,
				title      VARCHAR(128),
				game_id    VARCHAR(64),
				open_time  bigint,
				close_time bigint,
				users      UUID[]
			)
		`);
	}

	/**
	 * Adds a new tournament into the database.
	 *
	 * @param {Object}   data            Information about the tournament.
	 * @param {string}   data.title      The formatted title of the tournament.
	 * @param {Gametype} data.gametype   The game that is being played.
	 * @param {number}   data.open_time  The time of which this tournament opens.
	 * @param {number}   data.close_time The time of which this tournament closes.
	 *
	 * @returns {Tournament} The tournament that was created.
	 */
	async addTournament(data) {

		if(!data.slug) data.slug = slugify(data.title);

		const q = `
			INSERT INTO tournaments(slug, title, game, open_time, close_time)
			VALUES ($1, $2, $3, $4);
		`;

		let res = await this.pquery(q, [data.slug, data.title, data.open_time, data.close_time]);

		return res;
	}

}

module.exports = SQLDatabase;
