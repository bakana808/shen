
const Contest = require("./contest");
const Collection = require("./util/collection");
const User = require("./user");
const Match = require("./match");

var Event            = require("./event");

const { getRoundWins, getMatchPoint } = require("./util/matchutils");

const logger = new (require("./util/logger"))("set");

/**
 * Represents a set of matches.
 *
 * A set reads multiple matches in order to find a winner.
 *
 * A set can also contain metainfo (like characters or map chosen)
 * that is specific to the set.
 */
class MatchSet extends Contest {

	/**
	 * @param {string}  id
	 * @param {object}  options
	 * @param {number}  [options.time]
	 * @param {User[]|Collection<User>}  options.users
	 * @param {Match[]|Collection<Match>} [options.matches]
	 * @param {number}  [options.setLength]
	 */
	constructor(id, options) {

		super(id, "set", options);

		if(Array.isArray(options.users)) { // convert to collection
			
			options.users = Collection.from(options.users);
		}
		else {

			throw new Error("'users' option must be an array of users");
		}

		if(!options.matches) { options.matches = new Collection(); }

		if(isNaN(options.setLength)) { options.setLength = 3; }

		/**
		 * The users involved in the match.
		 *
		 * @type {User[]}
		 */
		Object.defineProperty(this, "users", { value: options.users, enumerable: true });

		/**
		 * The rounds.
		 *
		 * @type {Collection<Match>}
		 */
		this.matches = options.matches;

		/**
		 * The maximum amount of matches that can be in this set.
		 * This is usually in a "best-of-X" format (ex. best-of-3, best-of-5, etc.)
		 *
		 * @readonly
		 * @type {number}
		 */
		Object.defineProperty(this, "setLength", { value: options.setLength, enumerable: true });

		/**
		 * The tournament that this match is for.
		 *
		 * @readonly
		 * @type {Tournament}
		 */
		Object.defineProperty(this, "tournament", { value: options.tournament, enumerable: true });
	}

	addMatch(id, options) {

		var match = new TournyMatch({
			
		});
	}

	/**
	 * Gets the total amount of matches won for this user.
	 *
	 * @returns {number} The amount of match wins for this user.
	 */
	getSetCount(user) {

		if(!this.users.has(user.id)) {
			
			throw new Error(`the user ${ user.nametag() } is not a part of this match`);
		}

		let wins = 0;

		for(const match of this.matches) {

			if(user.equals(match.winner)) { wins++; }
		}

		return wins;
	}

	/**
	 * Constructs a Match using options containing references.
	 */
	async load(refs) {

		if(refs.in_progress) {

			throw new Error(`cannot construct an empty match (id=${refs.id})`);
		}

		let shen = require("./shen").shen;

		let users = await shen().getUserByID(refs.users);
		let winners;

		let rounds = await shen().getRound(refs.rounds);

		if(!refs.winners || refs.winners.length == 0) {

			logger.warn(`match #${refs.id} is missing winners, calculating manually`);

			let matchPoint = getMatchPoint(refs.num_rounds);
			winners = [];

			for(let user of users) {

				if(getRoundWins(user, rounds) >= matchPoint) winners.push(user);
			}
		}
		else {

			winners = await shen().getUserByID(refs.winners);
		}

		return new MatchSet({
			id:         refs.id,
			users:      users,
			winners:    winners,
			tournament: refs.tournament,
			num_rounds: refs.num_rounds,
			rounds:     rounds
		});
	}
}

module.exports = MatchSet;
