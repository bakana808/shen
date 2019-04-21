
const SQLDatabase = require("../sql");

/**
 * @abstract
 */
module.exports = class Table {

	/**
	 * @param {SQLDatabase} sql
	 */
	constructor(sql) {

		/** @type {SQLDatabase} */
		this.sql = sql;
	}

	info(msg) { this.sql.log.info(msg); }

	warn(msg) { this.sql.log.warn(msg); }

	error(msg) { this.sql.log.error(msg); }

	async pquery(query, args) { return this.sql.pquery(query, args); }

	async query(query) { return this.sql.query(query); }
};
