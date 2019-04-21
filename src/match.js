
// @ts-check

const User = require("./user");
const Contest = require("./contest");
const Collection = require("./util/collection");
const Scoreboard = require("./scoreboard");

/**
 * Represents a tournament match.
 *
 * A match keeps track of score per-user using a Scoreboard in order to find a winner.
 *
 * A match can also contain metainfo (like characters or map chosen)
 * that is specific to the match.
 */
class Match extends Contest {

	/**
	 * Creates a new match.
	 *
	 * @param {Object} options        Information about the match.
	 * @param {User[]} options.users  The users involved in the match.
	 * @param {object} [options.meta] Metainfo about the match.
	 * @param {number} [options.time] The time this match was created.
	 */
	constructor(id, options) {
		
		super(id, "match", options);

		if(Array.isArray(options.users)) { // convert to collection
			
			this.users = Collection.from(options.users);
		}
		else {

			throw new Error("'users' option must be an array of users");
		}

		/**
		 * The scoreboard used to keep track of user scores.
		 *
		 * @type {Scoreboard}
		 */
		this.scoreboard = new Scoreboard(this.users);

		/**
		 * Metainformation about the match.
		 * This may include things such as stage, characters used, etc.
		 *
		 * @readonly
		 * @type {Object}
		 */
		this.meta = options.meta;
	}

	/**
	 * Returns the first winner of this match.
	 * If a match somehow has more than one winner, then use match.winners instead.
	 *
	 * @returns {User} The winner of this match.
	 */
	getWinner() {

		return this.scoreboard.getWinner();
	}
}

/**
 * Creates a match using reference options.
 * This will retrieve options from the optionsbase.
 *
 * @param {object}   refs         An object containing reference options.
 * @param {string}   refs.id      The ID of this match.
 * @param {string[]} refs.users   An array of user UUIDs.
 * @param {object}   refs.meta    An object containing any metainfo about the match.
 * @param {number}   refs.time    The time the match took place.
 *
 * @returns {Promise<Match>} The Match that was loaded.
 */
async function load(refs) {

	let shen = require("./shen").shen;

	let users = await shen().getUserByID(refs.users);

	if(!Array.isArray(users)) {

		throw new Error("didn't recieve array of users from getUserByID");
	}

	let meta = {};
	
	if(refs.meta && (typeof refs.meta) === "string") {

		meta = JSON.parse(refs.meta);
	}

	let match = new Match(refs.id, {
		users: users,
		meta: meta
	});

	match.meta = {"test": "test"};

	return match;
}

module.exports.load = load;
module.exports = Match;
