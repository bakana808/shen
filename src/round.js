
/**
 * Represents a round of a match, commonly in a set of 3 or 5.
 *
 * Similar to a Match, it contains basic information like the time and winners,
 * but can also contain game-specific statistics relating to that specific
 * round, such as the characters or map chosen.
 */
class Round {
	constructor(id, winners, options = {}) {
		this.id = id;
		this.winners = winners;
		this.options = options;

		Object.freeze(this);
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
