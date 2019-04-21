
var Options = require("./util/options");

/**
 * This class represents a tournaments for a game.
 * Tournaments include Players, and a list of Matches.
 *
 * Ladder tournaments also fit under this class.
 *
 * @class
 */
class Tournament {

	/**
	 * Creates a tournament.
	 * It is not recommended to directly call this constructor, but to instead
	 * call <pre><code>shen().db.getTournament()</code></pre>.
	 *
	 * @param {Object} data Information about the tournament.
	 */
	constructor(data) {

		/**
		 * The formatted name of this tournament.
		 * @type {string}
		 */
		Object.defineProperty(this, "title", {
			value: data.title,
			enumerable: true
		});

		/**
		 * The users that are in this tournament.
		 * @type {User[]}
		 */
		Object.defineProperty(this, "users", {
			value: data.users,
			enumerable: true
		});

		/**
		 * The game that this tournament is for.
		 * @type {Gametitle}
		 */
		Object.defineProperty(this, "game", {
			value: data.game,
			enumerable: true
		});


		/**
		 * The matches that were played in this tournament.
		 * @type {Match[]}
		 */
		Object.defineProperty(this, "matches", {
			value: data.matches,
			enumerable: true
		});
	}

	getMatch(matchId) {
		return this.matches[matchId];
	}

	__verifyObject(data = {}) {
		data = Options.merge({
			title:   data.id,
			users:   null,
			game:    null,
			matches: null,
			ranker:  null
		}, data);

		if(data.title == null) {
			throw new ReferenceError("Tournament title cannot be null.");
		}

		if(data.users == null || !(data.users instanceof Array)) {
			throw new ReferenceError("Users for tournament is not an array.");
		}

		if(data.game == null) {
			throw new ReferenceError("Game used for tournament cannot be null.");
		}

		if(data.matches == null || !(data.matches instanceof Array)) {
			throw new ReferenceError("Matches for tournament is not an array.");
		}
	}
}

module.exports = Tournament;
