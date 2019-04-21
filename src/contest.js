
// @ts-check

const User = require("./user");

/**
 * Represents an event involving multiple users that can be won.
 *
 * @abstract
 */
module.exports = class Contest {

	/**
	 * Creates a contest.
	 *
	 * @param {string} id           The ID of the contest.
	 * @param {string} noun         What to refer to this contest as (ex. a "round" or a "match")
	 * @param {Object} options
	 * @param {number} [options.time] The time this round took place.
	 */
	constructor(id, noun = "contest", options) {

		if(!id) {

			throw new Error("an id must be provided");
		}

		if(!options.time) {

			options.time = Math.floor(Date.now() / 1000);
		}

		/**
		 * The ID of this round.
		 *
		 * @readonly
		 * @type {number}
		 */
		Object.defineProperty(this, "id", { value: id, enumerable: true });

		/**
		 * The time this round took place.
		 *
		 * @readonly
		 * @type {number}
		 */
		Object.defineProperty(this, "time", { value: options.time, enumerable: true });

		/**
		 * What to refer to this contest as.
		 * This is used to differentiate between different types of contests.
		 *
		 * @readonly
		 * @type {string}
		 */
		Object.defineProperty(this, "noun", { value: noun });
	}

	/**
	 * Returns true if there is at least one winner.
	 *
	 * @returns {boolean}
	 */
	isResolved() {

		throw new Error("this method is not implemented");
	}

	/**
	 * Returns the winner of this contest.
	 *
	 * @returns {User}
	 */
	getWinner() {

		throw new Error("this method is not implemented");
	}
}
