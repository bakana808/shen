
var math = require("mathjs");

var Logger = require("./util/logger");
var Scoreboard = require("./scoreboard");
var Ranker = require("./ranker");

var User = require("./user");
//var Player = require("./player");

var Round =       require("./match/round");
var Match =       require("./match");
var MatchSeries = require("./match/series");

var Gametype = require("./gametype");

var Tournament =     require("./tournament");
var UserStatistics = require("./tournament/statistics");
var TournamentStandings =        require("./tournament/standings");
var TournamentStandingsHistory = require("./tournament/history");

class shen {
	constructor() {
		shen.db = null;
	}

	// /**
	//  * Logs a message to the console. If two arguments are used,
	//  * the first argument will be used as the prefix.
	//  */
	// static log(lmsg, rmsg, level = "INFO") {
	// 	if(rmsg == null) {
	// 		console.log(`[${level}] ${lmsg}`);
	// 	} else {
	// 		console.log(`[${level}] ${rmsg}`);
	// 	}
	// }
	//
	// static info(lmsg, rmsg)  { Logger.log(lmsg, rmsg, "INFO"); }
	// static warn(lmsg, rmsg)  { Logger.log(lmsg, rmsg, "WARN"); }
	// static error(lmsg, rmsg) { Logger.log(lmsg, rmsg, "ERROR"); }

	static useDatabase(database) {
		shen.db = database;
	}

	static fetchTournament(tournamentId) {
		return shen.db.fetchTournament(tournamentId);
	}

	static fetchMatches(tournamentId) {
		if(tournamentId == null) { // fetch all matches
			return shen.db.fetchMatches();
		} else {
			return shen.db.fetchMatches(tournamentId);
		}
	}

	static fetchTournamentMatch(tournamentId, matchId) {
		return shen.db.fetchTournamentMatch(tournamentId, matchId);
	}

	static fetchTournamentUserIds(tournamentId) {
		return shen.db.fetchTournamentUserIds(tournamentId);
	}

	static fetchUser(userid) {
		return shen.db.fetchUser(userid).then(users => {
			if(users.length == 0) // user doesn't exist
				throw new ReferenceError("This user does not exist.");
			return users[0];
		});
	}

	static fetchUsers(userIds) {
		return shen.db.fetchUser(userIds);
	}

	static writeUser(userid) {
		return shen.db.writeUser(userid);
	}

	static bestOf(n, scores) {
		//var odd = n % 2; // if odd is 1, then a tie is impossible
		var scoreToWin = math.ceil(n / 2);
		var winners = [];
		Object.keys(scores).forEach((userid) => {
			if(scores[userid] >= scoreToWin) {
				winners.push(userid);
			}
		});
		return winners;
	}

	// static scoreboard(scoreMap, bestOf) {
	// 	var score_to_win = math.ceil(bestOf / 2);
	// 	return Scoreboard.create(scoreMap, (userid, score) => (score >= score_to_win));
	// }

	/**
	 * Returns the argument if it is already an array, but converts it into
	 * an array containing the argument otherwise.
	 *
	 * @returns {*[]} an array
	 */
	static toArray(a) {
		if(a instanceof Array) { return a; }
		return [a];
	}

	/**
	 * Constructs a new User object, given an ID and nickname.
	 *
	 * @param  {string} id       the user's ID
	 * @param  {string} nickname the nickname of the user
	 * @returns {User}           a new User object
	 */
	static User(id, nickname =  null) {
		if(nickname == null) {
			// create a dummy user
			Logger.warn("Dummy user was created for: " + id);
			return new User({ id: id, nickname: id });
		}
		return new User({ id: id, nickname: nickname });
	}

	// static Player(user, tournament) {
	// 	return new Player(user, { tournament: tournament });
	// }

	static Gametype(id, title) {
		return new Gametype(id, { title: title });
	}

	/**
	 * Constructs a game.
	 *
	 * @param {object}   obj                 The object representing this tournament.
	 * @param {string}   obj.id              The identifier for this game.
	 * @param {string}   obj.title           The title of this game.
	 * @param {string[]} obj.compatabilities The supported statistics of this game.
	 *
	 * = CHARACTER SUPPORT =
	 * @param {object}   obj.characters      The characters in this game.
	 *
	 * = STAGE SUPPORT =
	 * @param {object}   obj.stages          The stages in this game.
	 *
	 * @returns {Game}
	 */
	static Game(obj) {
		return new Gametype(obj);
	}

	/**
	 * Constructs a tournament.
	 *
	 * @param {object}   obj         The object representing this tournament.
	 * @param {string}   obj.id      The unique identifier for this match.
	 * @param {number}   obj.time    The time when this tournament opened.
	 * @param {string}   obj.title   The formatted name of this tournament.
	 * @param {Users[]}  obj.users   The users (by ID) that are in this tournament.
	 * @param {Gametype} obj.game    The game (by ID) that this tournament is for.
	 * @param {Match[]}  obj.matches The matches that were played.
	 *
	 * @returns {type}              description
	 */
	static Tournament(obj) {
		obj.ranker = new Ranker();
		return new Tournament(obj);
	}

	/**
	 * Constructs a match, given rounds.
	 *
	 * @param {object}     obj            The object representing the match.
	 * @param {string}     obj.id         The unique identifier for this match.
	 * @param {number}     obj.time       The time when the match took place.
	 * @param {Tournament} obj.tournament The tournament that this match is for.
	 * @param {Users[]}    obj.users      The users (by ID) that played in this match.
	 * @param {Users[]}    obj.winners    The users (by ID) that won this match.
	 * @param {number}     obj.numRounds  The total number of rounds to play.
	 * @param {Round[]}    obj.rounds     The rounds that were played.
	 *
	 * @returns {Match} the Match
	 */
	static Match(obj = {}) {
		obj.winners = MatchSeries.getWinner(obj.users, obj.rounds, obj.numRounds);
		return new MatchSeries(obj);
	}

	/**
	 * Constructs a match, given rounds.
	 *
	 * @param {object}     obj            The object representing the match.
	 * @param {string}     obj.id         The unique identifier for this match.
	 * @param {number}     obj.time       The time when the match took place.
	 * @param {Tournament} obj.tournament The tournament that this match is for.
	 * @param {Users[]}    obj.users      The users (by ID) that played in this match.
	 * @param {Users[]}    obj.winners    The users (by ID) that won this match.
	 *
	 * @returns {Match} the Match
	 */
	static MatchSimple(obj) {
		return new Match(obj);
	}

	/**
	 * Constructs a round
	 *
	 * @param {object} obj         The object representing a round.
	 * @param {User[]} obj.users   The users (by ID) that played in this round.
	 * @param {User[]} obj.winners The users (by ID) that won this round.
	 *
	 * @returns {type}         description
	 */
	static Round(obj = {}) {
		return new Round(obj);
	}

	static UserStatistics(obj = {}) {
		return new UserStatistics(obj);
	}

	/**
	 * Constructs an array of tournament standings for every match in the tournament.
	 *
	 * @param  {type} tournament description
	 * @returns {type}            description
	 */
	static TournamentStandingsHistory(tournament) {
		var standingsArray = [];
		var standings = new TournamentStandings({ tournament: tournament });

		tournament.matches.forEach(match => {
			standings = standings.inputMatch(match);
			standingsArray.push(standings);
		});

		return new TournamentStandingsHistory(standingsArray);
	}
	//
	// /**
	//  * Constructs the history of a Tournament, given a Tournament object.
	//  *
	//  * @param  {Tournament} tournament the tournament object
	//  * @returns {TournamentHistory}    the tournament history object
	//  */
	// static TournamentHistory(tournament) {
	// 	var history = new TournamentHistory(tournament.users);
	// }
	//
	// /**
	//  * Constructs a snapshot of a Tournament, given a Tournament object.
	//  */
	// static TournamentSnapshot(tournament) {
	//
	// }
	/**
	 * Merges two option objects a and b, where b overwrites a.
	 * @return {object} the merged options object
	 */
	static mergeOptions(a, b) {
		if(typeof a !== "object") {
			throw new TypeError("Default options is not an object.");
		}
		if(typeof b !== "object") {
			throw new TypeError("Options is not an object.");
		}
		a.forEach((v, k) => { if(k in b) a[k] = b[k]; });
	}
}

module.exports = shen;
