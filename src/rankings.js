

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

		var users = await shen().db.getAllUsers();

		var rankings = new Rankings({
			tournament: tournament,
			users: users
		});

		var matches = await shen().db.getAllMatches();

		// init statistics
		users.forEach(user => {
			rankings.stat_map.set(user.uuid, init_fn(user));
		});

		matches.forEach(m => {
			m.users.forEach(u => {

				let stats = rankings.stat_map.get(u.uuid);
				rankings.stat_map.set(u.uuid, match_fn(u, stats, m));
			});
		});

		return rankings;
	}
}

module.exports = Rankings;
