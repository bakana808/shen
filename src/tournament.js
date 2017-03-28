
var Options = require("./util/options");
var Event = require("./event");
var TournamentStandingsHistory = require("./tournament/history");

/**
 * This class represents a tournaments for a game.
 * Tournaments include Players, and a list of Matches.
 *
 * Ladder tournaments also fit under this class.
 */
class Tournament extends Event {
	constructor(obj) { super(obj); this.__verifyObject(obj);
		/**
		 * The formatted name of this tournament.
		 * @type {string}
		 */
		Object.defineProperty(this, "title", {value: obj.title});
		/**
		 * The users that are in this tournament.
		 * @type {User[]}
		 */
		Object.defineProperty(this, "users", {value: obj.users});
		/**
		 * The game that this tournament is for.
		 * @type {Gametype}
		 */
		Object.defineProperty(this, "game", {value: obj.game});
		/**
		 * The matches that were played in this tournament.
		 * @type {Match[]}
		 */
		Object.defineProperty(this, "matches", {value: obj.matches});
		Object.defineProperty(this, "ranker", {value: obj.ranker});
		/**
		 * The instances of tournament standings in this tournament, one for
		 * every match that took place.
		 * @type {TournamentStandings[]}
		 */
		Object.defineProperty(this, "standings", {value: TournamentStandingsHistory.from(this)});
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

	__verifyObject(obj = {}) {
		obj = Options.merge({
			title:   obj.id,
			users:   null,
			game:    null,
			matches: null,
			ranker:  null
		}, obj);

		if(obj.title == null) {
			throw new ReferenceError("Tournament title cannot be null.");
		}

		if(obj.users == null || !(obj.users instanceof Array)) {
			throw new ReferenceError("Users for tournament is not an array.");
		}

		if(obj.game == null) {
			throw new ReferenceError("Game used for tournament cannot be null.");
		}

		if(obj.matches == null || !(obj.matches instanceof Array)) {
			throw new ReferenceError("Matches for tournament is not an array.");
		}
	}
}

module.exports = Tournament;
