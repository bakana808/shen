
const { Client } = require("pg");
const { parse, unparse } = require("uuid-parse");
const chalk = require("chalk");

const logger = new (require("../util/logger"))("sql");

const uuidv4 = require("uuid/v4");
const UUID_LENGTH = 36; // 32 hex + 4 dashes

const User = require("../user");
const Round = require("../round");
const Match = require("../match");
const MatchBuilder = require("../matchbuilder");

const { getRoundWins, getMatchPoint } = require("../util/matchutils");

/**
 * A PostgreSQL Database.
 *
 * @class
 */
class SQLDatabase {

	/**
	 * Configures a SQL Database.
	 */
	constructor(uri = process.env.DATABASE_URL) {

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

				users   CHAR(${UUID_LENGTH})[],
				winners CHAR(${UUID_LENGTH})[]
			);
		`);

		/* create match table */
		this.query(`
			CREATE TABLE IF NOT EXISTS matches(
				id     serial PRIMARY KEY,

				tournament   integer DEFAULT null,

				num_rounds integer DEFAULT 0,
				rounds     integer[],

				users      CHAR(${UUID_LENGTH})[],
				winners    CHAR(${UUID_LENGTH})[]
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
	 * @async
	 * @returns {Promise<boolean>}
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
	async _cacheUser(user) {
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
	async _getCachedUser(uuid) {
		return this.userCache.get(uuid) || null;
	}

	/**
	 * Adds a user. The name of the user must be a string of 32 characters or less.
	 * If a discriminator isn't provided, one will be generated randomly.
	 *
	 * @param {string} name   the name of the user to create
	 * @param {string} [dscr] the descriminator of the user
	 *
	 * @returns {User} the user that was created
	 */
	async add_user(name, dscr = this.dscr()) {

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

	/**
	* Links a user to a Discord ID.
	*
	* @async
	* @param {string} discord_id the Discord ID to link
	* @param {string} uuid the uuid of the user to link it to
	*
	* @returns {Promise<User>} the user (after linking)
	*/
	async link_user_discord(discord_id, uuid) {
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
	 * Finds users matching a partial name.
	 *
	 * @param {string} partial The partial name of the user.
	 *
	 * @returns {Promise<User[]>} The users that match this partial name.
	 */
	async findUsers(partial) {
		const statement = `
			SELECT * FROM users
			WHERE name LIKE $1 || '%'
		`;

		var res = await this.pquery(statement, [partial]);

		return res.rows.map(row => new User({
			uuid: row.uuid,
			name: row.name,
			discriminator: row.discriminator
		}));
	}

	/**
	 * Constructs a user from a row in the database.
	 *
	 * @param {Object} row The database row.
	 *
	 * @returns {User} The user that was constructed.
	 */
	_constructUser(row) {
		return new User({ uuid: row.uuid, name: row.name, discriminator: row.discriminator});
	}

	/**
	 * Retrieves a user from the database by their UUID.
	 *
	 * @param {string} uuid the UUID of the user
	 *
	 * @returns {Promise<User>} the user that was retrieved
	 */
	async get_user(uuid) {

		// attempt to retrieve from cache
		let user = await this._getCachedUser(uuid);
		if(user) return user;

		// not cached - do a query
		const q = "SELECT * FROM users WHERE uuid=$1";

		let res = await this.pquery(q, [uuid]);

		if(res.rows.length == 0)
			throw new Error("this user does not exist (uuid = " + uuid + ")");

		return await this._cacheUser(this._constructUser(res.rows[0]));
	}

	async getUsers(uuids) {

		let users = [],
			remaining = []; // remaining uncached uuids for the query

		// find cached users
		for(let uuid of uuids) {
			let user = await this._getCachedUser(uuid);
			if(user) users.push(user); // add to users if cache found
			else remaining.push(uuid); // add to remaining if no cache found
		}

		// do a query for the remaining uuids
		const q = "SELECT * FROM users WHERE uuid = ANY($1)";

		let res = await this.pquery(q, [remaining]);

		return users.concat(res.rows.map(row => this._constructUser(row)));
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

		return res.rows.map(row => this._constructUser(row));
	}

	/**
	 * Retrieves a user from the database by their nametag.
	 * This comes in the form name#tag
	 *
	 * @async
	 * @param {string} nametag the nametag of the user
	 *
	 * @returns {Promise<User>} the user that was retrieved
	 */
	async getUserByTag(tag) {

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

		var data = res.rows[0];
		return new User({
			uuid: data.uuid,
			name: data.name,
			discriminator: data.discriminator
		});
	}

	/**
	 * Retrieves a user by their linked Discord ID.
	 * If a user with this Discord ID doesn't exist, an error will be thrown.
	 *
	 * @async
	 * @param {string} discord_id the user's Discord ID.
	 *
	 * @returns {Promise<User>} the user that was retrived
	 */
	get_user_discord(discord_id) {
		const statement = `
			SELECT * FROM users WHERE discord_id=$1;
		`;

		return this.pquery(statement, [discord_id])
			.then((res) => {
				if(res.rows.length == 0) {
					throw new Error("this user does not exist (discordID = " + discord_id + ")");
				}
				var obj = res.rows[0];

				return new User({ id: obj.uuid, username: obj.name, tag: obj.tag});
			});
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
	
	/**
	 * Inserts an empty match with base information.
	 * Returns the ID of the match that was inserted.
	 * Using this method on its own is not recommended. Use
	 * {@link MatchBuilder#open} instead.
	 *
	 * @param {MatchBuilder} mb The match builder.
	 *
	 * @return {number} The ID of the inserted match.
	 */
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

	async getRound(id) {
		const q = "SELECT * FROM rounds WHERE id=$1";

		var res = await this.pquery(q, [id]);

		if(res.rows.length == 0)
			throw new Error(`round (id=${ id }) does not exist`);
		
		let row = res.rows[0];
		
		let users =   await this.getUsers(row.users);
		let winners = await this.getUsers(row.winners);

		return new Round({
			id: id,
			users: users,
			winners: winners,
			meta: {} //TODO implement
		});
	}

	async _constructMatch(row) {

		if(row.in_progress)
			throw new Error(`cannot construct an empty match (id=${row.id})`);
		
		let users =   await this.getUsers(row.users);
		let winners;

		let promises = row.rounds.map(async (r_id) => await this.getRound(r_id));
		let rounds = await Promise.all(promises);

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

		var res = await this.pquery(q, [id]);

		if(res.rows.length == 0)
			throw new Error(`match #${ id } does not exist`);

		return await this._constructMatch(res.rows[0]);
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

		let promises = rows.map(async (row) => await this._constructMatch(row));
		return await Promise.all(promises);
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

}

module.exports = SQLDatabase;
