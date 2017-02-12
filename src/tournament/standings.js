
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
		if(options.statmap == null) {
			options.statmap = this.__initializeStats(options.tournament);
		}
		/**
		 * The tournament these standings are for.
		 * @type {Tournament}
		 */
		Object.defineProperty(this, "tournament", {value: options.tournament});

		Object.defineProperty(this, "statmap", {value: options.statmap});
	}

	inputMatch(match) {
		// shallow clone this instance's statmap
		var statmap = new Map(this.statmap);
		match.users.forEach(user => {
			// add match to each user of the match
			var stats = this.getStats(user).addMatch(match, this);
			statmap.set(user, stats);
		});
		return new TournamentStandings({
			tournament: this.tournament,
			statmap:    statmap
		});
	}

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
			return this.rating(b) - this.rating(a);
		});

		return users;
	}

	__initializeStats(tournament = this.tournament) {
		var statmap = new Map();
		tournament.users.forEach(user => {
			statmap.set(user, new Statistics({ user: user, ranker: tournament.ranker }));
		});
		return statmap;
	}
}

module.exports = TournamentStandings;
