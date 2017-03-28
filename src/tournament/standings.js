
var Statistics = require("./statistics");

/**
 * Represents player standings at a specific time in a tournament.
 */
class TournamentStandings {
	/**
	 * @param  {type} options description
	 * @returns {type}         description
	 */
	constructor(options) {
		var tournament;
		var statmap;

		if(options instanceof TournamentStandings) { // copy constructor
			tournament = options.tournament;
			statmap = options.statmap;
		} else {
			if(options.statmap == null) {
				options.statmap = this.__initializeStats(options.tournament);
			}
			tournament = options.tournament;
			statmap = options.statmap;
		}
		/**
		 * The tournament these standings are for.
		 * @type {Tournament}
		 */
		Object.defineProperty(this, "tournament", {value: tournament});

		Object.defineProperty(this, "statmap", {value: statmap});
	}
	/**
	 * Processes a match using the ranker and returns the updated tournament standings.
	 *
	 * @param  {Match} match         The match to process.
	 * @return {TournamentStandings} The updated tournament standings.
	 */
	pushMatch(match) {
		// check if all users in this match exist
		match.users.forEach(user => {
			if(!this.isEntrantPresent(user)) {
				throw new ReferenceError("This match includes a user not part of the tournament: " + user.nickname);
			}
		});
		// calculate rating adjustments
		return this.tournament.ranker.processMatch(this, match);
	}

	/**
	 * Returns true if the given user is a part of this instance of tournament standings.
	 *
	 * @param  {[type]} user [description]
	 * @return [type]        [description]
	 */
	isEntrantPresent(user) {
		return this.statmap.has(user);
		// var it = this.statmap.keys();
		// var next;
		// // iterate through users in statmap
		// while((next = it.next()).done == false) {
		// 	let val = next.value;
		// 	if(val.equals(user)) {
		// 		return true;
		// 	}
		// }
		//return false;
	}
	/**
	 * Returns the statistics of this user.
	 *
	 * @param  {User} user      The user.
	 * @return {UserStatistics} The statistics of this user.
	 */
	getEntrantStats(user) {
		if(user == null) {
			throw new TypeError("Unable to retrieve stats, the provided user is invalid: " + user);
		}
		if(!this.isEntrantPresent(user)) {
			throw new ReferenceError("Unable to retrieve stats, this user does not exist: " + user.nickname);
		}
		return this.statmap.get(user);
	}
	/**
	 * Sets the statistics of this user. This will return a new instance of tournament standings.
	 *
	 * @param  {[type]}   user [description]
	 * @param  {Function} fn   [description]
	 * @return [type]          [description]
	 */
	setEntrantStats(user, stats) {
		var statmapCopy = new Map(this.statmap);
		statmapCopy.set(user, stats);
		return new TournamentStandings({
			tournament: this.tournament,
			statmap: statmapCopy
		});
	}
	/**
	 * @deprecated
	 * @param  {[type]} user [description]
	 * @return [type]        [description]
	 */
	getStats(user) {
		return this.statmap.get(user);
	}

	/**
	 * Shortcut method to get the rating property of a user's statistics.
	 *
	 * @param  {type} user description
	 * @returns {type}      description
	 */
	rating(user) {
		return this.getStats(user).rating;
	}

	get rankings() {
		// shallow clone the tournament's array of users
		var users = this.tournament.users.slice();

		// then sort the cloned array by rating (decreasing)
		users.sort((a, b) => {
			if(this.rating(b) !== this.rating(a)) {
				return this.rating(b) - this.rating(a);
			} else {
				return this.getStats(b).winrate - this.getStats(a).winrate;
			}
		});

		return users;
	}

	__initializeStats(tournament = this.tournament) {
		var statmap = new Map();
		tournament.users.forEach(user => {
			statmap.set(user, new Statistics({ user: user, rating: tournament.ranker.initial }));
		});
		return statmap;
	}
}

module.exports = TournamentStandings;
