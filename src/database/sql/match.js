
// @ts-check

const Match = require("../../match");
const SQLDatabase = require("../sql");

const q = `

	CREATE TABLE IF NOT EXISTS matches(
		
		id     serial      PRIMARY KEY,
		users  UUID[]      DEFAULT array[]::UUID[]
		scores real[]      DEFAULT array[]::real[]
		meta   jsonb       DEFAULT '{}'::jsonb
	);
`;

/**
 * Contains all the match-related methods of a database.
 *
 */
class MatchTable {

	/**
	 * @param {SQLDatabase} sql The database.
	 */
	constructor(sql) {

		/**
		 * @type {SQLDatabase}
		 */
		this.sql = sql;

		this.sql.query(q); // create table
	}

	/**
	 * Creates an empty match in the database and returns an empty match.
	 */
	async createMatch(users) {

		if(!Array.isArray(users)) {

			throw new Error("must provide an array of users for the match");
		}

		const q = `

			INSERT INTO matches(users) VALUES ($1)
			RETURNING id;
		`;

		let res = await this.sql.pquery(q, [users.map(user => user.id)]);

		let id = res.rows[0].id;

		return new Match(id, { users: users });
	}

	async saveMatch(match) {
		
		const q = `

			UPDATE matches
			SET scores = $1,
			    meta   = $2;
		`;

		let scores = match.scoreboard.getScoreArray();
		let meta = match.meta;

		await this.sql.pquery(q, [ scores, meta ]);
	}

	async loadMatch(id) {

		const q = `

			SELECT * FROM matches WHERE id = $1;
		`;

		let res = await this.sql.query(q);

		if(res.rows.length == 0) {

			throw new Error("no match was found with ID '" + id + "'");
		}

		let userIds = res.rows[0].users;
		let scores  = res.rows[0].scores;
		let meta    = res.rows[0].meta;

		let users = await this.sql.getUserByID(userIds);

		if(!Array.isArray(users)) { throw new Error("didn't recieve array of users"); }

		let match = new Match(id, {
			users: users,
			meta: meta
		});

		for(const [score, i] of scores) {

			match.scoreboard.setScore(users[i], score);
		}

		return match;
	}
}

module.exports = MatchTable;
