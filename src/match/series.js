
var Options = require("../util/options");
var Match = require("../match");

//var Round = require("./round");

/**
 * Represents a tournament match that is made up from a set amount of rounds.
 *
 * In addition to the information a Match holds, a MatchSeries also holds:
 *  - the total number of rounds played (or "best of")
 *  - a list of the rounds played in the match
 *
 * The winner of the match is which player won the most rounds.
 * When played with an odd number of rounds like 3 or 5,
 * matches can only be won or lost, but if played with an even number like 4,
 * a tie is possible.
 */
class MatchSeries extends Match {
	constructor(obj = {}) {
		super(obj); this.__verifyObject(obj);
		/**
		 * The amount of rounds that should be played.
		 * @type {number}
		 */
		Object.defineProperty(this, "numRounds", {value: obj.numRounds});
		/**
		 * The rounds that were played.
		 * @type {Round[]}
		 */
		Object.defineProperty(this, "rounds", {value: obj.rounds});
	}

	/**
	 * Gets the amount of points to win the match.
	 * This number is based on the amount of rounds to be played divided by two,
	 * rounded down, and incremented by 1. For example:
	 *  - Series of 3 ((floor(3 / 2) = 1) + 1 = 2)
	 *  - Series of 4 ((floor(4 / 2) = 2) + 1 = 3) (tie is possible)
	 *  - Series of 5 ((floor(5 / 2) = 2) + 1 = 3)
	 *
	 * @returns {number} the match point of this match
	 */
	getMatchPoint() { return Math.floor(this.series / 2) + 1; }

	/**
	 * Gets the amount of points this user has accumalated by winning rounds
	 *
	 * @returns {object} an object of userIds and how many points the user has
	 */
	getRoundWins(user) {
		var wins = 0;
		// create an empty
		this.rounds.forEach(round => {
			// check if this player exists in the match
			if(!this.userIds.includes(round.winner)) {
				throw new ReferenceError(`The User (i d=${ round.winner }) in a round that doesn't exist for this Match (id=${ this.id })`);
			}
			// check if this user is the winner
			if(user.equals(round.winner)) wins++;
		});
		return wins;
	}

	/**
	 * Calculates the winner of this match.
	 */
	static getWinner(users, rounds, numRounds) {

		var matchPoint = Math.floor(numRounds / 2) + 1;
		var wins = {};

		// initialize wins for each user
		users.forEach(user => { wins[user.id] = 0; });

		// check winners of rounds
		rounds.forEach(round => {
			if(round.winner.in(users)) wins[round.winner.id]++;
		});

		var winner = null;

		// check wins for each user
		users.forEach(user => {
			if(wins[user.id] >= matchPoint) {
				winner = user;
				return false;
			}
		});

		// if no winner, return null
		return winner == null ? null : [winner];
	}

	__verifyObject(obj = {}) {
		obj = Options.merge({
			rounds: [],     // the array containing Round instances
			numRounds: null // how many rounds should be played
		}, obj);

		if(obj.numRounds < obj.rounds.length) {
			throw new RangeError("There are more rounds in this match than the needed amount.");
		}
	}
}

module.exports = MatchSeries;
