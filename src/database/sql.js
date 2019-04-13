
const Database = require("./database");

/* For timing functions */
const { performance } = require("perf_hooks");

/* PostgreSQL API */
const { Client } = require("pg");

const chalk              = require("chalk");
const slugify            = require("slugify");

const logger = new (require("../util/logger"))("sql");

const User =       require("../user");
const Round =      require("../round");
const Match =      require("../match");

const { getRoundWins, getMatchPoint } = require("../util/matchutils");

/**
 * A PostgreSQL Database.
 *
 * @extends Database
 */
class SQLDatabase extends Database {

	/**
	 * Configures a SQL Database.
	 *
	 * @param {string} uri The URI to the PostgreSQL database
	 */
	constructor(uri = process.env.DATABASE_URL) {

		super();
		if(!uri) {

			logger.warn("ev 'DATABASE_URL' is missing! any database calls will throw an error.");
		}
		/**
		 * The database URI to use.
		 *
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
		 * @member {pg.Client}
		 */
		this.client;

		/**
		 * A cache of uuids to users for faster queries
		 *
		 * @member {Map<string, User>}
		 */
		this.userCache = new Map();

		/* create user table */
		this.query(`
			CREATE TABLE IF NOT EXISTS users(
				uuid       UUID PRIMARY KEY  DEFAULT uuid_generate_v4(),
				discord_id VARCHAR(20),
				verified   BOOLEAN           DEFAULT false,
				tag        CHAR(4),
				name       VARCHAR(32)
			);
		`);

		/* create round table */
		this.query(`
			CREATE TABLE IF NOT EXISTS rounds(
				id serial PRIMARY KEY,

				game integer DEFAULT null,

				users   UUID[],
				winners UUID[]
			);
		`);

		/* create match table */
		this.query(`
			CREATE TABLE IF NOT EXISTS matches(
				id     serial PRIMARY KEY,

				tournament   integer DEFAULT null,

				num_rounds integer DEFAULT 0,
				rounds     integer[],

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
			logger.warn("tried to open a connection that was already open");
		}
	}

	async close() {
		if(this.isConnected && this.client != null) {
			this.client.end();
			this.isConnected = false;
		} else {
			logger.warn("tried to close a connection that was already closed");
		}
	}

	async openSilently() {
		if(!this.isConnected) { await this.open(); }
	}

	/**
	 * Opens a connection to the SQL database, closes it, then returns.
	 *
	 * @returns {void}
	 */
	async test() {

		await this.openSilently();
		await this.close();
	}

	/**
	 * The result of a successful query.
	 *
	 * @external Result
	 * @see {@link https://node-postgres.com/api/result}
	 */

	/**
	 * Executes a query. Not recommended for user input due to SQL injection.
	 *
	 * @param {string} statement the query to run
	 *
	 * @returns {external:Result} the result of the query if successful
	 */
	async query(statement) {

		await this.openSilently();
		return await this.client.query(statement);
	}

	/**
	 * Executes a parameterized query.
	 *
	 * @param {string} statement the query to run
	 * @param {Array}  values    the arguments to use in the query
	 *
	 * @returns {external:Result} the result of the query if successful
	 */
	async pquery(statement, values) {

		await this.openSilently();
		return await this.client.query(statement, values);
	}

	/**
	 * Generates a discriminator. This will be a number between 0 and 9999,
	 * and will be padded with 0s to 4 characters.
	 *
	 * TODO move this to another class
	 *
	 * @returns {string} a 4-character numerical tag
	 */
	dscr() {
		const DSCR_LENGTH = 4;

		var n = Math.floor(1000 + (Math.random() * 9000)); // generates a tag between 0000 and 9999
		var length = n.toString().length;

		return "0".repeat(DSCR_LENGTH - length) + n;
	}

	//==========================================================================
	// USER QUERIES
	//==========================================================================
	
	/**
	 * Caches a user. This will be used where possible for future calls to getUser or getUsers.
	 *
	 * @param {User} user The user to cache.
	 *
	 * @returns {User} The user that was cached.
	 */
	async cacheUser(user) {

		this.userCache.set(user.uuid, user);
		return user;
	}

	/**
	 * Tries to find a cached user. If this user wasn't cached, null will be returned.
	 *
	 * @param {string} uuid The uuid of the user to retrieve.
	 *
	 * @returns {?User} The cached user or null.
	 */
	async getCachedUser(uuid) {

		return this.userCache.get(uuid) || null;
	}

	/** @override */
	async addUser(name, dscr = this.dscr()) {

		var tag = name + "#" + dscr;
		const statement = `
			INSERT INTO users(uuid, discriminator, name) VALUES(
				uuid_generate_v4(),
				$1,
				$2
			)
			RETURNING *;
			`;

		try {
			var res = await this.pquery(statement, [dscr, name]);
			logger.info(`added new user ${ tag.green } (uuid: ${ res.rows[0].uuid })`);

			return new User({
				uuid: res.rows[0].uuid,
				name: name,
				discriminator: dscr
			});
		} catch (e) {
			logger.warn(`failed to add user ${ tag.green }`);
			throw e;
		}
	}

	/** @override */
	async getUser(tag) {

		if(!tag.includes("#"))
			return Promise.reject(new Error("nametag does not contain a '#'"));

		var split = tag.split("#");
		var name = split[0];
		var dscr = split[1];

		const statement = `
		SELECT * FROM users
		WHERE name=$1 AND discriminator=$2
		`;

		var res = await this.pquery(statement, [name, dscr]);

		if(!res.rows.length)
			throw new Error(`the user ${ tag } does not exist`);

		return this.cacheUser(await User.load(res.rows[0]));
	}

	/** @override */
	async getUserByID(uuid) {

		if(!Array.isArray(uuid)) { // find a single user

			// attempt to retrieve from cache
			let user = await this.getCachedUser(uuid);
			if(user) return user;

			// not cached - do a query
			const q = "SELECT * FROM users WHERE uuid=$1";

			let res = await this.pquery(q, [uuid]);

			if(res.rows.length == 0)
				throw new Error("this user does not exist (uuid = " + uuid + ")");

			return this.cacheUser(await User.load(res.rows[0]));
		}
		else if(Array.isArray(uuid)) { // find multiple users recursively
		
			let t = performance.now();

			let uuids = uuid;

			var users = [];
			uuids.forEach(async (uuid) => {

				var user = await this.getUserByID(uuid);
				users.push(user);
			});

			logger.info(`retrieved ${ uuids.length } users (${ (performance.now() - t).toFixed(2) }ms)`);

			return users;
		}
	}

	/** @override */
	async searchUsers(partial) {

		const statement = `
			SELECT * FROM users
			WHERE LOWER(name) LIKE '%' || $1 || '%'
		`;

		var res = await this.pquery(statement, [ partial.toLowerCase() ]);

		return Promise.all(res.rows.map(row => User.load(row)));
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
			logger.info(`linked user ${ tag.green } to discord id ${ discord_id.green }`);
			return this.get_user_discord(discord_id);

		} else {

			throw new Error("this user does not exist (uuid = " + uuid + ")");
		}
	}

	/**
	 * Constructs a user from a row in the database.
	 *
	 * @param {Object} row The database row.
	 *
	 * @returns {User} The user that was constructed.
	 */
	async _constructUser(row) {
		let user = new User({ uuid: row.uuid, name: row.name, discriminator: row.discriminator});
		await this.cacheUser(user);
		return user;
	}


	/**
	 * Retrieves all users from the database.
	 * Not recommended when the user table becomes large.
	 *
	 * @return {User[]} An array of users.
	 */
	async getAllUsers() {
		const q = "SELECT * FROM users";

		var res = await this.query(q);

		let users = [];
		for(let row of res.rows) {

			users.push(await this.cacheUser(User.load(row)));
		}
		
		return users;
	}

	/** @override */
	async getUserByLink(options) {

		if(!options) {

			throw new Error("parameter must be an object");
		}

		const q = "SELECT * FROM users WHERE discord_id=$1;";

		let res = await this.pquery(q, [ options.discord ]);

		if(res.rows.length == 0) {

			return null;
		}
		else {

			return this._constructUser(res.rows[0]);
		}
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
	async openMatch(mb) {
		const q = `
			INSERT INTO matches(users, num_rounds) VALUES ($1, $2)
			RETURNING *;
		`;

		var res = await this.pquery(q, [mb.users.map(user => user.uuid), mb.num_rounds]);
		logger.info(`opened new match #${ res.rows[0].id }`);

		return parseInt(res.rows[0].id);
	}

	/**
	 * Inserts a round into a match in progress.
	 *
	 * @param {Object} options             Information about the round.
	 * @param {User[]} options.users       The users involved in the round.
	 * @param {User[]} options.winners     The winners of the round.
	 * @param {Object} [options.meta = {}] Metainfo about the round.
	 *
	 * @returns {Round} The round that was created.
	 */
	async addRound(data) {

		var id; // ID of the added round

		const q = `
			INSERT INTO rounds(users, winners) VALUES ($1, $2)
			RETURNING *;
		`;

		let user_uuids = data.users.map(user => user.uuid);
		let winr_uuids = data.winners.map(user => user.uuid);

		let res = await this.pquery(q, [user_uuids, winr_uuids]);
		id = parseInt(res.rows[0].id);
		logger.info(`added round #${ id }`);

		return new Round({
			id: id,
			users: data.users,
			winners: data.winners,
			meta: {}
		});
	}

	/**
	 * Updates a match with information from a MatchBuilder
	 *
	 * @param {MatchBuilder} mb The match builder.
	 */
	async updateMatch(mb) {

		const q = `
			UPDATE matches
			SET winners     = $1,
				rounds      = $2,
				in_progress = $3
			WHERE id = $4
		`;

		if(mb.id != null) {

			await this.pquery(q, [mb.winners.map(u => u.uuid), mb.rounds.map(r => r.id), mb.in_progress, mb.id]);

			if(mb.in_progress) {
				logger.info(`updated match #${ mb.id }`);
				return null;
			} else {
				var m = mb.getMatch();
				logger.info(
					chalk.green(`completed match #${ m.id } (rids: ${ m.rounds.map(r => r.id) }): `) +
					`${ m.users[0].tagc } ` +
					chalk.yellow(`(${ m.getRoundWins(m.users[0]) } - ${ m.getRoundWins(m.users[1]) }) `) +
					`${ m.users[1].tagc }`
				);
			}
		}
	}

	/**
	 * Retrieves rounds by their ID from the database.
	 *
	 * @param {number[]} ids The IDs of the rounds to retrieve.
	 *
	 * @returns {Promise<Round>} The rounds that was retrieved.
	 */
	async getRound(ids) {

		let t1 = performance.now();

		var single = false;

		if(!Array.isArray(ids)) {
			
			single = true;
			ids = [ids];
		}
		const q = "SELECT * FROM rounds WHERE id = ANY($1)";
		let res = await this.pquery(q, [ids]);
		let refs = res.rows;
		
		logger.info(`read rounds ${ ids } in ${ performance.now() - t1 }ms`);

		// convert references into rounds
		let rounds = Promise.all(refs.map(r => Round.load(r)));

		logger.info(`loaded rounds ${ ids } in ${ performance.now() - t1 }ms`);

		return (single ? (await rounds)[0] : rounds);
	}

	async _constructMatch(row) {

		if(row.in_progress)
			throw new Error(`cannot construct an empty match (id=${row.id})`);

		let users =   await this.getUsers(row.users);
		let winners;

		let rounds = await this.getRounds(row.rounds);

		if(!row.winners || row.winners.length == 0) {
			logger.warn(`match #${row.id} is missing winners, calculating manually`);

			let matchPoint = getMatchPoint(row.num_rounds);
			winners = [];

			for(let user of users) {
				if(getRoundWins(user, rounds) >= matchPoint) winners.push(user);
			}
		} else {
			winners = await this.getUsers(row.winners);
		}

		return new Match({
			id:         row.id,
			users:      users,
			winners:    winners,
			tournament: row.tournament,
			num_rounds: row.num_rounds,
			rounds:     rounds
		});
	}

	/**
	 * Gets a match from the database by the match ID.
	 *
	 * @param {number} id The ID of the match to get.
	 *
	 * @returns {Match} The retrieved match.
	 */
	async getMatch(id) {
		
		const q = "SELECT * FROM matches WHERE id=$1";

		let res = await this.pquery(q, [id]);

		if(res.rows.length == 0) {

			throw new Error(`match #${ id } does not exist`);
		}
		else {

			return await Match.load(res.rows[0]);
		}
	}

	/**
	 * Gets all matches from the database.
	 *
	 * @returns {Match[]} An array of matches.
	 */
	async getAllMatches() {

		const q = "SELECT * FROM matches";

		var res = await this.query(q);

		let rows = res.rows.filter(row => !row.in_progress);

		let matches = [];
		for(let row of rows) {
			matches.push(await Match.load(row));
		}

		return matches;
	}

	/**
	 * Writes a match into the database.
	 */
	async addMatch(match) {
		const round_query = `
			INSERT INTO rounds(users, winners) VALUES ($1, $2)
			RETURNING *;
		`;

		const match_query = `
			INSERT INTO matches(users, winners, rounds, num_rounds) VALUES ($1, $2, $3, $4)
			RETURNING *;
		`;

		var round_ids = [];
		for(let i = 0; i < match.rounds.length; i++) {

			let round = match.rounds[i];
			let user_uuids = round.users.map(user => user.uuid);
			let winr_uuids = round.winners.map(user => user.uuid);

			let res = await this.pquery(round_query, [user_uuids, winr_uuids]);
			round_ids.push(parseInt(res.rows[0].id));
		}

		let res = await this.pquery(match_query, [
			match.users.map(user => user.uuid),
			match.winners.map(user => user.uuid),
			round_ids,
			match.num_rounds
		]);

		let match_id = res.rows[0].id;

		logger.info(
			chalk.green(`added match #${ match_id } (rids: ${ round_ids }): `) +
			`${ match.users[0].tagc } ` +
			chalk.yellow(`(${ match.getRoundWins(match.users[0]) } - ${ match.getRoundWins(match.users[1]) }) `) +
			`${ match.users[1].tagc }`
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
		//           default match rules as well as what metainfo will be required.
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
