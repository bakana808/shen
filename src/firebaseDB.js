
var firebase = require("firebase");
var Promise = require("promise");

var shen = require("./shen");
var User =  require("./user");
var MatchSet = require("./match");
var Round = require("./round");
var Gametype = require("./gametype");
var Tournament = require("./tournament");

class Database {
	constructor(prefix) {
		if(typeof prefix === "string") {
			this.prefix = prefix;
		} else {
			this.prefix = "database | ";
		}
	}

	info(message) { console.log(this.prefix + message); }

	/**
	 * Reads tournament matches from a database.
	 * {tournamentId} is the database identifier for the tournament.
	 *
	 * @returns an array of Matches
	 */
	readTournyMatchCount(tournamentId, callback) { callback(0); }

	readTournyMatch(tournamentId, matchId, callback) { callback(null); }

	/**
	 * Returns tournament entrants from a database.
	 * {tournamentId} is the database identifier for the tournament.
	 *
	 * @returns an array of Player userIds
	 */
	readTournyuserIds(tournamentId, callback) { callback([]); }

	/**
	 * Reads a User from the database by their userid.
	 *
	 * @returns a User, or null if the userid doesn't exist
	 */
	readUser(userid, callback) { callback(null); }
}
