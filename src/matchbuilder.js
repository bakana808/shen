
const { findUserIn } = require("./util/userutils");
const Logger         = require("./util/logger");
const User           = require("./user");
const Match          = require("./match");
const Round          = require("./round");
const Tournament     = require("./tournament");

const { shen }       = require("./shen");

/**
 * Helps construct matches by adding rounds to it one-by-one.
 * This will help to judge things like if we're adding too many rounds to a match.
 *
 * @class
 */
class MatchBuilder {

	static checkMatchObject(data) {
		
		if(!data.tournament) {
			Logger.warn("match data missing tournament ID");
		}

		if(!data.users)
			throw new Error("match data missing 'users' property");

		if(!data.num_rounds)
			throw new Error("match data missing 'num_rounds' property");
	}

	static checkCompleteMatchObject(data) {

		MatchBuilder.checkMatchObject(data);

		if(!data.rounds)
			throw new Error("match data missing 'rounds' property");

		if(!data.winners)
			throw new Error("match data missing 'winners' property");
	}

	/**
	 * Initializes a MatchBuilder by providing base information about the match.
	 * When the Match is built, this information is passed onto it.
	 *
	 * @private Use {@link MatchBuilder#open} instead.
	 *
	 * @param {Object}      options                      Information about the match.
	 * @param {User[]}      options.users                The users involved in this match.
	 * @param {?Tournament} [options.tournament = null]  The tournament this match belongs to.
	 * @param {number}      [options.num_rounds = 3]     The maximum amount of rounds in the match.
	 *
	 * @param {Match[]}     [options.matches = []]        The current rounds in this match
	 *                                                   (if continuing a match in progress)
	 *
	 * @param {User[]}      [options.winners = []]       The current winners in this match
	 *                                                   (if continuing a match in progress)
	 */
	constructor(options) {

		MatchBuilder.checkMatchObject(options);

		/**
		 * Whether to edit the database upon the modification of the MatchBuilder.
		 *
		 * @readonly
		 * @type {boolean}
		 */
		Object.defineProperty(this, "live", { value: options.live, writable: false });

		/**
		 * The users involved in this match.
		 *
		 * @readonly
		 * @type {User[]}
		 */
		Object.defineProperty(this, "users", { value: options.users, writable: false });

		/**
		 * The tournament this match belongs to.
		 * If null, this match only applies when calculating a global ladder tournament (all matches)
		 *
		 * @readonly
		 * @type {?Tournament}
		 */
		Object.defineProperty(this, "tournament", { value: options.tournament, writable: false });

		/**
		 * The maximum amount of rounds in this match.
		 * If this is an odd number, there is a chance that not all rounds will be played.
		 * For example, if a match between two players required 3 matches and one player won the first two,
		 * then that player would win by default.
		 *
		 * @readonly
		 * @type {number}
		 */
		Object.defineProperty(this, "num_rounds", { value: options.num_rounds, writable: false });

		/**
		 * An array of the current rounds added to this match.
		 *
		 * @type {Round[]}
		 */
		this.rounds = Array.isArray(options.rounds) ? options.rounds : [];

		/**
		 * An array of the winners in this match.
		 * This array will be updated every time a round is added.
		 *
		 * @type {User[]}
		 */
		this.winners = Array.isArray(options.winners) ? options.winners : [];

		/**
		 * Whether this match needs any more rounds or not.
		 * This usually means a winner has been decided.
		 *
		 * @type {boolean}
		 */
		this.in_progress = true;

		/**
		 * The amount of round wins needed to win the match.
		 *
		 * This amount is based on the total amount of rounds needed divided by two,
		 * rounded down, and incremented by 1. For example:
		 *  - Series of 3 ((floor(3 / 2) = 1) + 1 = 2)
		 *  - Series of 4 ((floor(4 / 2) = 2) + 1 = 3) (tie is possible)
		 *  - Series of 5 ((floor(5 / 2) = 2) + 1 = 3)
		 *
		 * @returns {number} The match point of this match.
		 */
		this.match_point = Math.floor(this.num_rounds / 2) + 1;

		//========================================================================
		// These will probably be set asynchronously after the initial construction
		
		/**
		 * The ID of this match (in the database).
		 *
		 * @type {number}
		 */
		this.id = options.id ? options.id : -1;
	}

	/**
	 * Opens a match in progress. This will create a new MatchBuilder as well
	 * as edit the database.
	 *
	 * @param {Object} options            Basic information about the match.
	 * @param {User[]} options.users      The users in this match.
	 * @param {number} options.num_rounds The amount of rounds needed.
	 *
	 * @returns {MatchBuilder} A match builder.
	 */
	static async open(options) {

		options.live = true; // enable live database editing

		var mb = new MatchBuilder(options);

		var id = await shen().db.openMatch(options);
		mb.id = id;

		return mb;
	}

	/**
	 * Creates a new MatchBuilder. When creating a match this way,
	 * an ID
	 *
	 * @param {Object} options            Basic information about the match.
	 * @param {number} options.id         The ID of the match.
	 * @param {User[]} options.users      The users in this match.
	 * @param {number} options.num_rounds The amount of rounds needed.
	 *
	 * @returns {MatchBuilder} A match builder.
	 */
	static async create(options) {

		options.live = false;

		return new MatchBuilder(options);
	}

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
	 * Updates this match to see if it is complete.
	 *
	 * @returns {?Match} The match if it is complete, null if not.
	 */
	async updateMatch() {
		this.users.forEach((user) => {
			if(this.getRoundWins(user) >= this.match_point) {
				this.winners.push(user);
				this.in_progress = false;
				return false;
			}
		});
		var match = null;
		if(!this.in_progress) {
			match = this.getMatch();
		}
		if(this.live) {
			await shen().db.updateMatch(this);
		}
		return match;
	}

	getMatch() {

		if(this.in_progress) {

			throw new Error("tried to get an in-progress match");
		}

		return new Match({
			id:         this.id,
			tournament: this.tournament,
			users:      this.users,
			num_rounds: this.num_rounds,
			rounds:     this.rounds,
			winners:    this.winners
		});
	}

	/**
	 * Adds a round to the builder, and returns true if more rounds are needed.
	 *
	 * @param {Object}  data         Information about the round.
	 * @param {?number} data.id      The ID of the round (if this match builder isn't live)
	 * @param {User[]}  data.winners The winners of this round.
	 * @param {Object}  data.meta    Any metainfo about this round.
	 *
	 * @returns {?Match} The match if it is complete, null if not.
	 */
	async addRound(data) {

		if(this.complete) {
			Logger.warn("adding round to a completed match");
		}

		// check users to make sure they're a part of this match
		data.users.forEach((user) => {
			if(!findUserIn(user, this.users)) {
				throw new Error(`cannot add round: this match does not involve user "${ user.tagc }"`);
			}
		});

		if(data.winners == null)
			throw new Error("cannot add round: this round does not have a winner");

		if(data.meta == null) {
			Logger.warn("adding round without metainfo");
		}

		var round;
		if(this.live) {

			round = await shen().db.addRound({
				id:      data.id,
				users:   this.users,
				winners: data.winners,
				meta:    data.meta
			});
		}
		else {

			round = new Round({
				id:      data.id,
				users:   this.users,
				winners: data.winners,
				meta:    data.meta
			});
		}

		this.rounds.push(round);
		return await this.updateMatch();
	}
}

module.exports = MatchBuilder;
