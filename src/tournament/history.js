
var TournamentStandings = require("./standings");

/**
 * Wraps around a list of tournament standing instances. Allows the retrieval of
 * tournament standings at any point in time.
 */
class TournamentStandingsHistory {
	constructor(standingsArray, matchMap) {
		/**
		 * The list of tournament standings instances.
		 * @type{TournamentStandings[]}
		 */
		Object.defineProperty(this, "standingsArray", {value: standingsArray});

		Object.defineProperty(this, "matchMap", {value: matchMap});
	}

	latest() {
		return this.standingsArray[this.standingsArray.length - 1];
	}

	at(match) {
		return this.matchMap.get(match);
	}

	/**
	 * Constructs an array of tournament standings for every match in the tournament.
	 *
	 * @param  {type} tournament description
	 * @returns {type}            description
	 */
	static from(tournament) {
		var standingsArray = [];
		var standings = new TournamentStandings({ tournament: tournament });

		var matchMap = new Map();

		tournament.matches.forEach(match => {
			standings = standings.inputMatch(match);
			standingsArray.push(standings);
			matchMap.set(match, standings);
		});

		return new TournamentStandingsHistory(standingsArray, matchMap);
	}
}
// class TournamentHistory {
// 	constructor(userIds) {
// 		this._userIds = userIds;
// 		this._stats_array = [new TournamentStats(userIds)];
// 	}
//
// 	playerExists(userid) { return this._userIds.includes(userid); }
//
// 	size() { return this._stats_array.length; }
//
// 	latest(n = 0) {
// 		return this._stats_array[this.size() - 1 + n];
// 	}
//
// 	atMatch(mid) {
// 		return this._stats_array[mid];
// 	}
//
// 	add(match) { this._stats_array.push(this.readMatch(match)); }
//
// 	/**
// 	 * Reads the match and applys the changes to a clone of
// 	 * this instance of TournamentStats.
// 	 *
// 	 * @returns {TournamentStats} a clone with the changes applied
// 	 */
// 	readMatch(match) {
// 		var stats = this.latest().clone();
// 		if(match.isComplete()) {
//
// 			var adjustments = {};
//
// 			// retrieve rating adjustments from match
// 			match.userIds.forEach(userid => {
//
// 				var pstats = stats.getPlayerStats(userid);
// 				pstats._matchCount++;
//
// 				var opponent = match.getOpponents(pstats.userid)[0];
// 				var opponent_rating = stats.rating(opponent);
//
// 				var adjustment = 0;
// 				if(match.isWinner(pstats.userid)) {
// 					pstats._wins++;
// 					adjustment = Math.ceil(shenElo.adjust(pstats.rating, opponent_rating, 1) * gainMap.get(pstats.rating));
//
// 					if((opponent_rating - pstats.rating) < 0) { // opponent is lower rating
// 						adjustment = Math.ceil(adjustment * lowMap.get(pstats.rating));
// 					}
// 				} else {
// 					adjustment = Math.ceil(shenElo.adjust(pstats.rating, opponent_rating, 0) * lossMap.get(pstats.rating));
// 				}
//
// 				adjustments[pstats.userid] = adjustment;
// 			});
//
// 			// apply adjustments
// 			match.userIds.forEach(userid => {
//
// 				var pstats = stats.getPlayerStats(userid);
// 				pstats._rating += adjustments[pstats.userid];
// 			});
// 		}
// 		return stats;
// 	}
//
// 	static create(tournament, matches, options) {
// 		return new Promise((resolve, reject) => {
// 			Logger.log("statistics", "creating statistical history for tournament " + tournament.id);
// 			Logger.log("statistics", `using matches 0 - ${ matches.length }.`);
//
// 			tournament.fetchuserIds()
// 			.then(userIds => {
//
// 				/** @type {TournamentStats[]} */
// 				var statsHistory = new TournamentHistory(userIds);
//
// 				// Logger.log("statistics", "initializing player stats...");
// 				// userIds.forEach(userid => {
// 				// 	pstats_map.set(userid, new PlayerStats(userid));
// 				// });
//
// 				Logger.log("statistics", "reading matches...");
// 				matches.forEach(match => statsHistory.add(match));
//
// 				Logger.log("statistics", "done.");
//
// 				resolve(statsHistory);
// 			})
// 			.catch(error => reject(error));
// 		});
// 	}
// }

module.exports = TournamentStandingsHistory;
