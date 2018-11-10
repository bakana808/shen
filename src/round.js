
/**
 * Represents a round of a match, commonly in a set of 3 or 5.
 *
 * Similar to a Match, it contains basic information like the time and winners,
 * but can also contain game-specific statistics relating to that specific
 * round, such as the characters or map chosen.
 */
class Round {

	/**
	 * Creates a new round.
	 *
	 * @param {Object} options             Information about the round.
	 * @param {number} options.id          The ID of this round.
	 * @param {User[]} options.users       The users involved in the round.
	 * @param {User[]} options.winners     The winners of the round.
	 * @param {Object} [options.meta = {}] Metainfo about the round.
	 */
	constructor(options) {

		/**
		 * The ID of this round.
		 *
		 * @readonly
		 * @type {number}
		 */
		Object.defineProperty(this, "id", { value: options.id, writable: false });

		/**
		 * The users involved in the round.
		 *
		 * @readonly
		 * @type {User[]}
		 */
		Object.defineProperty(this, "users", { value: options.users, writable: false });

		/**
		 * The winners of this round.
		 * Normally there should be only one winner, but just in case...
		 *
		 * @readonly
		 * @type {User[]}
		 */
		Object.defineProperty(this, "winners", { value: options.winners, writable: false });

		/**
		 * Metainformation about the round.
		 * This may include things such as stage, characters used, etc.
		 *
		 * @readonly
		 * @type {Object}
		 */
		Object.defineProperty(this, "meta", { value: options.meta, writable: false });


	}

	/**
	 * Returns the first winner of this round.
	 * If a round somehow has more than one winner, then use round.winners instead.
	 *
	 * @returns {User} The winner of this round.
	 */
	get winner() { return this.winners[0]; }
}

module.exports = Round;

// var Match = require("./match");
//
// /**
//  * This class represents a single round of a match, which usually means a single
//  * in-game match.
//  */
// class Round extends Match {
// 	constructor(match, roundid, winners) {
// 		super(roundid, match.userIds, winners);
//
// 		this.match = match;
//
// 		Object.freeze(this);
// 	}
//
// 	get dbModel() {
// 		return {
// 			winners: this.winners
// 		};
// 	}
//
// 	get match() { return this._match; }
// }
