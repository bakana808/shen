
var Options = require("../util/options");
var Logger = require("../util/logger");

/**
 * Represents a round of a match, commonly in a set of 3 or 5.
 *
 * Similar to a Match, it contains basic information like the time and winners,
 * but can also contain game-specific statistics relating to that specific
 * round, such as the characters or map chosen.
 */
class Round {
	constructor(obj = {}) { this.__verifyObject(obj);
		/**
		 * The array of users that are involved in this match.
		 * @type {User[]}
		 */
		Object.defineProperty(this, "users", {value: obj.users});
		/**
		 * The array of users that are considered "winners" of this match.
		 * @type {User[]}
		 */
		Object.defineProperty(this, "winners", {value: obj.winners});

	}

	__verifyObject(obj) {
		obj = Options.merge({
			users:   null,
			winners: null
		}, obj);

		if(obj.users == null || !(obj.users instanceof Array)) {
			throw new ReferenceError("Users for match is not an array.");
		}

		if(obj.winners == null) {
			throw new ReferenceError("Winners for match is not an array.");
		}
	}

	// a shortcut to return only the first winner
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
