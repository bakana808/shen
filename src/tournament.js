
var Options = require("./util/options");

var Gametitle = require("./gametype");

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
	 * @param {
	 */
	constructor(data) {

		/**
		 * The formatted name of this tournament.
		 * @type {string}
		 */
		Object.defineProperty(this, "title", {value: data.title});

		/**
		 * The users that are in this tournament.
		 * @type {User[]}
		 */
		Object.defineProperty(this, "users", {value: data.users});

		/**
		 * The game that this tournament is for.
		 * @type {Gametitle}
		 */
		Object.defineProperty(this, "game", {value: data.game});

		/**
		 * The matches that were played in this tournament.
		 * @type {Match[]}
		 */
		Object.defineProperty(this, "matches", {value: data.matches});
	}

	// fetchStats() {
	// 	return TournamentStatsHistory.create(this, this.matches);
	// }

	/**
	 * Returns the userIds of all the entrants of this Tournament.
	 */
	//get userIds() { return this._userIds; }

	/**
	 * Returns a Player by their userid.
	 */
	getUser(userId) {
		// shen.db.readUser(userid, (user) => {
		// 	if(user === null) {
		// 		callback(null);
		// 		return;
		// 	}
		//
		// 	callback(new Player(userid, user));
		// });
		var found = null;
		this.users.forEach(user => {
			if(user.id == userId) {
				found = user; return false;
			}
		});

		if(found != null) return found;

		throw new ReferenceError(`The user with ID ${ userId } does not exist.`);
	}
	/**
	 * Returns true if this tournament contains a user, by their user ID.
	 *
	 * @param  {type} userId description
	 * @returns {type}        description
	 */
	hasUser(userId) {
		this.users.forEach(user => { if(user.id == userId) return true; });
		return false;
	}

	getMatch(matchId) {
		return this.matches[matchId];
	}

	// forEachMatch(callback, toMatchId = -1) {
	// 	shen.db.forEachTournyMatch(this._id, toMatchId, callback);
	// }

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
