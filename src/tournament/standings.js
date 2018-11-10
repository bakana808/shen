
const Logger = require("../util/logger");

const { shen } = require("../shen");

/**
 * Represents user rankings in a tournament at a moment in time.
 *
 * @class
 */
class Rankings {

	/**
	 * Constructs the rankings of a tournament.
	 *
	 * @param {Object}     data              Information about the rankings.
	 * @param {Tournament} [data.tournament] The tournament these rankings are for.
	 */
	constructor(data) {

		/**
		 * The tournament these standings are for.
		 * @type {Tournament}
		 */
		Object.defineProperty(this, "tournament", {value: data.tournament});

		/**
		 * The array of users in the rankings.
		 * This array should be in order of their placement in the rankings.
		 *
		 * @type {User[]}
		 */
		this.users = [];

		/**
		 * The map of users to their statistics.
		 * Statistics may vary by the system of ranking.
		 *
		 * @type {Map<User, Object>}
		 */
		this.stat_map = new Map();
	}

	/**
	 * A function that initializes the stats of a user.
	 * @callback InitFn
	 *
	 * @param {User} user The user.
	 *
	 * @returns {Object} An object containing initial statistics.
	 */

	/**
	 * A function that takes a match and modifies the stats of a user accordingly.
	 * @callback MatchFn
	 *
	 * @param {User}   user  The user.
	 * @param {Object} stats The user's stats.
	 * @param {Match}  match The match that was played.
	 *
	 * @returns {Object} An object containing modified statistics.
	 */

	/**
	 * Calculates the ranking of users.
	 * If a tournament is provided, only matches of that tournament will be read.
	 * If no tournament is provided, all matches will be read.
	 *
	 * @param {?Tournament} tournament The tournament to take matches from.
	 * @param {InitFn}      init_fn    The initialize function.
	 * @param {MatchFn}     match_fn   The match function.
	 */
	static async calculate(tournament = null, init_fn, match_fn) {

		var rankings = new Rankings({
			tournament: tournament
		});

		Logger.info("shen: " + shen);

		var users = shen().db.getAllUsers();

		var matches = shen().db.getAllMatches();

		// init statistics
		users.forEach(user => {
			rankings.stat_map.set(user, init_fn(user));
		});

		matches.forEach(m => {
			m.users.forEach(u => {

				let stats = rankings.stat_map.get(u);
				rankings.stat_map.set(u, match_fn(u, stats, m));
			});
		});
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
	 * @param   {User} user the user
	 * @returns {boolean} true if this user is a part of these standings.
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
	 * @param  {User}       user     the user
	 * @param  {Statistics} stats    the statistics to assign to this user
	 * @return {TournamentStandings} the updated tournament standings
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
	 * @param  {User} user  the user
	 * @return {Statistics} the statistics of this user
	 */
	getStats(user) {
		return this.statmap.get(user);
	}

	/**
	 * Shortcut method to get the rating property of a user's statistics.
	 *
	 * @param  {User} user the user
	 * @returns {number} this user's rating
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
}

module.exports = Rankings;
