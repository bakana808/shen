
var EventEmitter = require("events");
var Promise      = require("promise");

var shen = require("./shen");
var Elo = require("./elo");
var RatingMap = require("./elo/rating_map");

var shenElo = new Elo({
	k: {
		1100: 80,
		1000: 70,
		950: 70,
		0: 60
	},
	floor: 500
});

/**
 * Loss Bonus for having a high rating.
 */
var lossMap = new RatingMap({
	1100: 1.5,
	1000: 1,
	950: 1,
	0: 0.5
});

/**
 * Gain Bonus for having a low rating.
 */
var gainMap = new RatingMap({
	1100: 1,
	1000: 1,
	950: 1,
	0: 1.5
});

/**
 * Gain Penalties for challenging a player lower than you.
 */
var lowMap = new RatingMap({
	1100: 1,
	1000: 1,
	950: 1,
	0: 1
});

class PlayerStats {
	constructor(userid) {
		this._userid = userid;
		this._matchCount = 0;
		this._wins = 0;
		//this._losses = 0;
		this._rating = 1000;
	}

	get userid() { return this._userid; }
	get total_matches() { return this._matchCount; }
	get wins() { return this._wins; }
	get losses() { return this._matchCount - this._wins; }

	get rating() { return this._rating; }

	get division() {
		if(this.rating >= 1100) return "S";
		if(this.rating >= 1000) return "A";
		if(this.rating >= 950) return "B";
		return "C";
	}

	adjustRating(diff) {
		Logger.log(`Rating of Player (id=${userid}) adjusted by ${ diff } (${ this.rating + diff })`);
		var pstats = new PlayerStats(this);

	}

	clone() {
		var clone = new PlayerStats(this._userid);
		clone._matchCount = this._matchCount;
		clone._wins =       this._wins;
		//clone._losses =     this._losses;
		clone._rating =     this._rating;
		return clone;
	}
}

/**
 * This class represents player statistics for a specific tournament.
 * These statistics works with a certain amount of matches from the tournament.
 * By default, the statistics are for every match in the tournament, but it can
 * also be used in a snapshot-like way (i.e. statistics only up to the 10th match).
 *
 * If "date" is defined in the options as a UNIX time, only matches up until that date
 * will be used.
 *
 * If "match" is defined in the options as a number, only the matches up until that match
 * will be used. If "match" is -1 (the default), every match will be used.
 *
 * If "player" is defined in the options, the "match" option will be used relative
 * to the player. For example, if "match" is 5, the statistics will read up until
 * the defined player's 5th match.
 */
class TournamentStats extends EventEmitter {
	constructor(userIds) {
		super();
		this._userIds = userIds;
		this._pstats_map = new Map();

		userIds.forEach(userid => {
			this._pstats_map.set(userid, new PlayerStats(userid));
		});

		//this._tournament = tournament;
		//this._matchId = -1; // to the last match

		// if(typeof options === "object") {
		//
		// 	if("match" in options) { this._matchId = options.match; }
		// }
	}

	getPlayerStats(userid) {
		if(this._pstats_map.has(userid)) { return this._pstats_map.get(userid); }
	}

	forEach(fn) {
		this._userIds.sort((a, b) => { return this.rating(b) - this.rating(a); });

		this._userIds.forEach((userid) => fn(this.getPlayerStats(userid), userid));
	}

	rating(userid) { return this.getPlayerStats(userid).rating; }

	/**
	 * Creates a clone of this instance of TournamentStats.
	 *
	 * @returns {TournamentStats} a clone of this instance
	 */
	clone() {
		var clone = new TournamentStats(this._userIds);
		this._pstats_map.forEach((pstats, userid) => {
			clone._pstats_map.set(userid, pstats.clone());
		});
		return clone;
	}

	static clonePlayerStats(pstats_map) {
		var clone = new Map();
		pstats_map.forEach((pstats, userid) => {
			clone.set(userid, pstats.clone());
		});
		return clone;
	}
}

/**
 * This class contains a list of TournamentStats states.
 */
class TournamentStatsHistory {
	constructor(userIds) {
		this._userIds = userIds;
		this._stats_array = [new TournamentStats(userIds)];
	}

	playerExists(userid) { return this._userIds.includes(userid); }

	size() { return this._stats_array.length; }

	latest(n = 0) {
		return this._stats_array[this.size() - 1 + n];
	}

	atMatch(mid) {
		return this._stats_array[mid];
	}

	add(match) { this._stats_array.push(this.readMatch(match)); }

	/**
	 * Reads the match and applys the changes to a clone of
	 * this instance of TournamentStats.
	 *
	 * @returns {TournamentStats} a clone with the changes applied
	 */
	readMatch(match) {
		var stats = this.latest().clone();
		if(match.isComplete()) {

			var adjustments = {};

			// retrieve rating adjustments from match
			match.userIds.forEach(userid => {

				var pstats = stats.getPlayerStats(userid);
				pstats._matchCount++;

				var opponent = match.getOpponents(pstats.userid)[0];
				var opponent_rating = stats.rating(opponent);

				var adjustment = 0;
				if(match.isWinner(pstats.userid)) {
					pstats._wins++;
					adjustment = Math.ceil(shenElo.adjust(pstats.rating, opponent_rating, 1) * gainMap.get(pstats.rating));

					if((opponent_rating - pstats.rating) < 0) { // opponent is lower rating
						adjustment = Math.ceil(adjustment * lowMap.get(pstats.rating));
					}
				} else {
					adjustment = Math.ceil(shenElo.adjust(pstats.rating, opponent_rating, 0) * lossMap.get(pstats.rating));
				}

				adjustments[pstats.userid] = adjustment;
			});

			// apply adjustments
			match.userIds.forEach(userid => {

				var pstats = stats.getPlayerStats(userid);
				pstats._rating += adjustments[pstats.userid];
			});
		}
		return stats;
	}

	static create(tournament, matches, options) {
		return new Promise((resolve, reject) => {
			Logger.log("statistics", "creating statistical history for tournament " + tournament.id);
			Logger.log("statistics", `using matches 0 - ${ matches.length }.`);

			tournament.fetchuserIds()
			.then(userIds => {

				/** @type {TournamentStats[]} */
				var statsHistory = new TournamentStatsHistory(userIds);

				// Logger.log("statistics", "initializing player stats...");
				// userIds.forEach(userid => {
				// 	pstats_map.set(userid, new PlayerStats(userid));
				// });

				Logger.log("statistics", "reading matches...");
				matches.forEach(match => statsHistory.add(match));

				Logger.log("statistics", "done.");

				resolve(statsHistory);
			})
			.catch(error => reject(error));
		});
	}
}

module.exports = TournamentStatsHistory;
