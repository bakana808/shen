
const { findUserIn } = require("./util/userutils");
var Options          = require("./util/options");
var Event            = require("./event");

/**
 * Represents a tournament match.
 *
 * A match is immutable and must be able to provide the following information:
 *   1. the unique id referencing this specific match
 *   2. the Users in this match.
 *   3. the winners (Users) of this match.
 *
 * @class
 */
class Match {

	constructor(data) {

		/**
		 * The ID of the match.
		 *
		 * @type {number}
		 */
		Object.defineProperty(this, "id", {value: data.id});

		/**
		 * The raw database object that was used to construct this match.
		 *
		 * @type {object}
		 */
		Object.defineProperty(this, "obj", {value: data.obj});

		/**
		 * The array of users that are involved in this match.
		 *
		 * @type {User[]}
		 */
		Object.defineProperty(this, "users", {value: data.users});

		/**
		 * The array of users that are considered "winners" of this match.
		 *
		 * @type {User[]}
		 */
		Object.defineProperty(this, "winners", {value: data.winners});

		/**
		 * The tournament that this match is for.
		 *
		 * @type {Tournament}
		 */
		Object.defineProperty(this, "tournament", {value: data.tournament});

		/**
		 * The maximum amount of rounds in this tournament.
		 *
		 * @type {number}
		 */
		Object.defineProperty(this, "num_rounds", { value: data.num_rounds });

		/**
		 * The rounds in this tournament.
		 *
		 * @type {Round[]}
		 */
		Object.defineProperty(this, "rounds", {value: data.rounds});


	}

	/**
	 * The winner of the match, or first winner of the match if there are
	 * multiple winners.
	 *
	 * @returns {User} the first winner of the match
	 */
	get winner()  { return this.winners[0]; }

	/**
	 * The UNIX time in which this match took place.
	 * If the time is null, the match did not contain the time.
	 *
	 * @returns {number} the time the match took place
	 */
	//get time() { return this.options.time; }

	/**
	 * Gets the total amount of round wins for this user according to the rounds
	 * currently added.
	 *
	 * @returns {number} The amount of round wins for this user.
	 */
	getRoundWins(user) {

		if(!findUserIn(user, this.users)) throw new Error(`the user ${ user.nametag() } is not a part of this match`);
		let wins = 0;

		this.rounds.forEach((round) => {
			if(user.equals(round.winner)) wins++;
		});

		return wins;
	}

	/**
	 * Gets the "score" of the player, which is a number between 0 to 1 (inclusive).
	 * A score of 0.5 is a tie, where any score higher or lower than 0.5
	 * is a win or loss, respectively.
	 * A score of 1 or 0 is a complete win or loss.
	 *
	 * @returns {number} a score from 0 to 1
	 */
	getScore(user) {
		if(!this.isComplete()) {
			throw new ReferenceError("Cannot calculate score when match is not complete");
		}
		if(this.isWinner(user)) {
			return 1;
		} else {
			return 0;
		}
	}

	/**
	 * Returns true if this match contains the provided user.
	 *
	 * @param  {type} userid description
	 * @returns {Boolean}
	 */
	hasUser(user) { return user.in(this.users); }

	/**
	 * Returns true if the provided user is one of the winners of this match.
	 *
	 * @param  {type} userid description
	 * @returns {type}        description
	 */

	isWinner(user) {
		if(this.winners == null) {
			return false;
		}
		return user.in(this.winners);
	}

	/**
	 * Returns true if the match is tied between mulitple users, or in other
	 * words, has more than one winner.
	 *
	 * @returns {boolean} true if this match has more than one winner
	 */
	isTie() { return this.winners.length > 1; }

	/**
	 * Returns true if the match has at least one winner.
	 *
	 * @returns {boolean} true if this match has at least one winner
	 */
	isComplete() { return this.winners.length > 0; }

	/**
	 * Gets a user by their order in the total list of users, where 0 is the
	 * first user, 1 is the second user, and etc.
	 *
	 * @param {number} n the position to find the user
	 * @returns {number} the user at that position
	 */
	getUserByOrder(n) {
		if(typeof n !== "number") {
			throw new TypeError("This position is not a number.");
		}
		if(n >= this.users.length) {
			throw new RangeError("There is no user at this position.");
		}
		return this.users[n];
	}

	getOpponent(user) { return this.getOpponents(user)[0]; }

	getOpponents(user) {
		if(!this.hasUser(user))
			throw new ReferenceError("This player does not exist in this match.");
		var opponents = [];
		this.users.forEach(_user => {
			if(!_user.equals(user)) opponents.push(_user);
		});
		return opponents;
	}

	/**
	 * Verifies an object version of a Match.
	 * This method will throw an error if the properties of this match are
	 * invalid.
	 *
	 * @param  {type} obj = this description
	 * @returns {type}            description
	 */
	__verifyObject(data = this) {
		data = Options.merge({
			obj: {},
			users:      null, // the users (ids) in the match
			winners:    null, // the winners (ids) of the match
			//tournament: null, // the tournament (id) of the match
		}, data);

		if(data.users == null || !(data.users instanceof Array)) {
			throw new ReferenceError("Users for match is not an array.");
		}

		if(data.winners == null) {
			throw new ReferenceError("Winners for match is not an array.");
		}

		if(!(data.users instanceof Array)) data.users = [data.users];

		// if(data.tournament == null) {
		// 	throw new ReferenceError("Tournament ID for match cannot be null.");
		// }
	}
}

module.exports = Match;

// class MatchSet extends Match {
//
// 	/**
// 	 * constructor - description
// 	 *
// 	 * @param  {number} id          the unique id of this match
// 	 * @param  {string[]} userIds   the userIds in this match
// 	 * @param  {string[]} winners   the winners (userIds) of this match
// 	 * @param  {object} wins        an object containing total round wins of each player
// 	 * @param  {Round[]} rounds     an array containing all the rounds of this match
// 	 * @param  {object} options     options object
// 	 */
// 	constructor(id, userIds, winners, wins, rounds, options) {
// 		super(id, userIds, winners, options);
//
// 		this._rounds = rounds;
// 		this._wins = wins;
// 	}
//
// 	get rounds() { return this._rounds; }
//
// 	getRoundWins(userid) { return this._wins[userid]; }
//
// 	getScore(userid) {
// 		if(!this.isComplete()) {
// 			throw new ReferenceError("cannot get score when match is not complete");
// 		}
// 		return this._wins[userid] / this.rounds.length;
// 	}
// }
