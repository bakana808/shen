

const Logger = require("./util/logger");

const { shen } = require("./shen");

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
		Object.defineProperty(this, "users", {value: data.users});

		/**
		 * The map of users to an object representing their statistics.
		 * Note that the stats object is arbitrary and can widely vary depending
		 * on the system used for ranking.
		 *
		 * @type {Map<User, Object>}
		 */
		this.stat_map = new Map();
	}

	/**
	 * Sets the stats object for a user.
	 *
	 * @param {User}   user  The user.
	 * @param {Object} stats This user's stats object.
	 */
	setStats(user, stats) { this.stat_map.set(user.uuid, [user, stats]); }

	/**
	 * Retrieves the stats object for a user.
	 * Note that this function will return a copy of the original stat object
	 * as to not allow accidental edits of the original.
	 * Please use a combination of {@link getStats()} and {@link setStats()} to
	 * edit stats.
	 *
	 * @param {User} user The user.
	 *
	 * @returns {Object} A copy of this user's stats object.
	 */
	getStats(user) {
		var tuple = this.stat_map.get(user.uuid);
		return JSON.parse(JSON.stringify(tuple[1]));
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
	 * @param {Object}      options            The ranking options.
	 * @param {?Tournament} options.tournament The tournament to take matches from.
	 * @param {InitFn}      options.onStart    The initialize function.
	 * @param {MatchFn}     options.onMatch   The match function.
	 * @param {EndFn}       options.onFinish     The end function.
	 * @param {SortFn}      options.sort_fn    The method of which to sort users.
	 */
	static async calculate(options) {

		var users = await shen().db.getAllUsers();
		var matches = await shen().db.getAllMatches();

		var rankings = new Rankings({
			tournament: options,
			users: users
		});

		// init statistics
		users.forEach(user => {
			let stats = options.onStart(user);
			rankings.setStats(user, stats);
		});

		// match function
		matches.forEach(m => {

			let statChanges = [];
			m.users.forEach(u => {

				let stats = rankings.getStats(u);
				stats = options.onMatch(u, stats, m, rankings);
				statChanges.push([u, stats]);
			});
		
			for(let tuple of statChanges)
				rankings.setStats(tuple[0], tuple[1]);
		});

		// end statistics
		if(!options.onFinish) options.end_fn = (_user, stats) => stats;
		users.forEach(user => {

			let stats = rankings.getStats(user);
			stats = options.onFinish(user, stats);
			rankings.setStats(user, stats);
		});

		// sort users
		let tuples = Array.from(rankings.stat_map);
		
		for(let tuple of tuples) {
			Logger.info("key: " + tuple[0] + ", value: " + tuple[1]);
		}
		tuples.sort((a, b) => options.sort_fn(a[1][1], b[1][1]));
		// replace user uuids with users
		tuples = tuples.map(tuple => tuple[1]);

		return tuples;
	}
}

module.exports = Rankings;
