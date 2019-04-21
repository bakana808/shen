
const SQLDatabase = require("../sql");
const Table = require("./table");
const User = require("../../user");
const Collection = require("../../util/collection");

const q = `

	CREATE TABLE IF NOT EXISTS users(
		id         UUID PRIMARY KEY  DEFAULT uuid_generate_v4(),
		discord_id VARCHAR(20),
		verified   BOOLEAN           DEFAULT false,
		dscr       CHAR(4),
		name       VARCHAR(32)
	);
`;

/**
 * Wrapper class for all user-related queries
 */
class UserTable extends Table {

	/**
	 * @param {SQLDatabase} sql
	 */
	constructor(sql) { super(sql);

		this.userCache = new Collection();
		this.query(q);
	}

	/**
	 * Caches a user. This will be used where possible for future calls to getUser or getUsers.
	 *
	 * @param {User} user The user to cache.
	 *
	 * @returns {User} The user that was cached.
	 */
	cacheUser(user) {

		this.userCache.set(user.id, user);
		return user;
	}

	/**
	 * Tries to find a cached user. If this user wasn't cached, null will be returned.
	 *
	 * @param {string} id The uuid of the user to retrieve.
	 *
	 * @returns {?User} The cached user or null.
	 */
	getCachedUser(id) {

		return this.userCache.get(id) || null;
	}

	/**
	 * @param {string} name
	 * @param {string} [dscr]
	 *
	 * @returns {Promise<User>}
	 */
	async addUser(name, dscr) {

		if(!name) {

			throw new Error("a name must be provided");
		}

		if(!dscr) {

			dscr = generateDiscriminator();
		}

		var tag = name + "#" + dscr;

		const q = `

			INSERT INTO users(uuid, discriminator, name) VALUES(
				uuid_generate_v4(),
				$1,
				$2
			)
			RETURNING *;
		`;

		try {

			var res = await this.pquery(q, [dscr, name]);
			this.info(`added new user ${ tag.green } (id: ${ res.rows[0].id })`);

			return new User({
				id: res.rows[0].id,
				name: name,
				discriminator: dscr
			});
		}
		catch (e) {

			this.warn(`failed to add user ${ tag.green }`);
			throw e;
		}
	}

	/**
	 * @param {string} tag
	 *
	 * @returns {Promise<User>}
	 */
	async loadUser(tag) {

		if(!tag.includes("#"))
			return Promise.reject(new Error("nametag does not contain a '#'"));

		var split = tag.split("#");
		var name = split[0];
		var dscr = split[1];

		const q = `
		
			SELECT * FROM users
			WHERE name=$1 AND discriminator=$2
		`;

		var res = await this.pquery(q, [name, dscr]);

		if(!res.rows.length) {

			throw new Error(`the user ${ tag } does not exist`);
		}

		return this.cacheUser(new User(res.rows[0]));
	}

	/**
	 * @param {string[]} ids
	 *
	 * @returns {Promise<User[]>}
	 */
	async loadUsersByID(ids) {

		if(!Array.isArray(ids)) {
			
			throw new Error("argument must be an array of user ids");
		}
		else if(ids.length == 0) {
			
			return [];
		}
		else if(ids.length == 1) { // find a single user

			let id = ids[0];

			// attempt to retrieve from cache
			let user = await this.getCachedUser(id);

			if(!user) {
				
				// not cached - do a query
				const q = "SELECT * FROM users WHERE id=$1";

				let res = await this.pquery(q, [id]);

				if(res.rows.length == 0) {

					throw new Error("this user does not exist (id = " + ids + ")");
				}

				user = this.cacheUser(new User(res.rows[0]));
			}

			return [user];
		}
		else { // find multiple users recursively
		
			let t = performance.now();

			var user_array = [];
			ids.forEach(async (id) => {

				var users = await this.loadUsersByID([id]);
				if(users.length > 0) { user_array.push(users[0]); }
			});

			this.info(`retrieved ${ ids.length } users (${ (performance.now() - t).toFixed(2) }ms)`);

			return user_array;
		}
	}
	
	async searchUsers(partial) {

		const statement = `
			SELECT * FROM users
			WHERE LOWER(name) LIKE '%' || $1 || '%'
		`;

		var res = await this.pquery(statement, [ partial.toLowerCase() ]);

		return Promise.all(res.rows.map(row => new User(row)));
	}

	/**
	 * @param {string} id
	 * @param {object} options
	 *
	 * @return {Promise<User>}
	 */
	async linkUser(id, options) {

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

		var res = await this.pquery(statement, [discord_id, id]);

		if(res.rows.length > 0) {
			
			let row = res.rows[0];
			let tag = row.name + "#" + row.discriminator;
			this.info(`linked user ${ tag.green } to discord id ${ discord_id.green }`);

			return this.loadUsersByID([id])[0];

		} else {

			throw new Error("this user does not exist (uuid = " + id + ")");
		}
	}

	async loadUserByLink(options) {

		if(!options) {

			throw new Error("parameter must be an object");
		}

		const q = "SELECT * FROM users WHERE discord_id=$1;";

		let res = await this.pquery(q, [ options.discord ]);

		if(res.rows.length == 0) {

			return null;
		}
		else {

			return res.toUser();
		}
	}

}

/**
 * Generates a discriminator. This will be a number between 0 and 9999,
 * and will be padded with 0s to 4 characters.
 *
 * TODO move this to another class
 *
 * @returns {string} a 4-character numerical tag
 */
function generateDiscriminator() {

	const DSCR_LENGTH = 4;

	var n = Math.floor(1000 + (Math.random() * 9000)); // generates a tag between 0000 and 9999
	var length = n.toString().length;

	return "0".repeat(DSCR_LENGTH - length) + n;
}

module.exports = UserTable;
module.exports.generateDiscriminator = generateDiscriminator;

