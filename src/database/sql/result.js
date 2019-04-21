
const SQLDatabase = require("../sql");
const User = require("../../user");

import MatchSet from "../../set";

/**
 * A wrapper class for a PostgreSQL Query.Result object
 * that adds helper methods
 */
module.exports = class SQLResult {

	/**
	 * @param {SQLDatabase} sql
	 * @param {object} result
	 */
	constructor(sql, result) {

		/**
		 * @type {SQLDatabase}
		 */
		this.sql = sql;

		/**
		 * @type {object}
		 */
		this.result = result;
	}

	get rows() { return this.result.rows; }

	/**
	 * Creates a single user from a query result.
	 *
	 * @returns {Promise<User?>}
	 */
	async toUser() {

		let users = await this.toUsers();

		if(users.length == 0) { return null; }

		return users[0];
	}

	/**
	 * Creates an array of Users from a query result.
	 *
	 * @returns {Promise<User[]>}
	 */
	async toUsers() {

		let users = [];

		if(this.rows.length > 0) {

			for(const row of this.rows) {

				let user = new User({
					id: row.id,
					name: row.name,
					discriminator: row.discriminator
				});

				users.push(user);
			}
		}

		return users;
	}

	/**
	 * Creates a Set from a query result.
	 *
	 * @returns {Promise<MatchSet>}
	 */
	async toMatchSet() {

		if(this.rows.length == 0) {

			throw new Error("cannot make match set from empty query result");
		}

		let row = this.rows[0];

		let match = new MatchSet(row.id, {

			
		});
	}
};
