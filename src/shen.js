
var Logger = require("./util/logger");
var Ranker = require("./ranker");

var User = require("./user");

var Round                      = require("./match/round");
var Match                      = require("./match");
var MatchSeries                = require("./match/series");
var Gametype                   = require("./gametype");
var Tournament                 = require("./tournament");
var UserStatistics             = require("./tournament/statistics");
var TournamentStandings        = require("./tournament/standings");
var TournamentStandingsHistory = require("./tournament/history");

const logger = new (require("./util/logger"))();

/**
 * Contains all the basic API functions of this application.
 */
class Shen {

	/**
	 * Constructs the central API object.
	 *
	 * @param {Object}          data        The components of the API.
	 * @param {SQLDatabase}     data.db     The database.
	 * @param {CommandListener} data.cl     The command listener.
	 * @param {http.Server}     data.server The server.
	 * @param {DiscordClient}   data.bot    The discord bot.
	 */
	constructor(data) {
		this.db = data.db;

		this.cl = data.cl;

		this.server = data.server;

		this.bot = data.bot;

		if(Shen.instance) {
			logger.warn("tried to create a new API instance; one already exists");
		} else {
			Shen.instance = this;
		}
	}

	/**
	 * Waits until every component is ready to use, then resolves.
	 *
	 * @returns {void}
	 */
	async init() {

		await this.bot.init();
	}

	/**
	 * @static
	 * Defines which database this API should use. All further functions that
	 * use a database will use this one.
	 *
	 * @param  {Database} database The database to use.
	 */
	static useDatabase(database) {
		//shen.db = database;
	}

	//region// Tournament Functions ////////////////////////////////////////////

	/**
	 * @static
	 * Returns the "active" tournament. The active tournament is the tournament
	 * that usually gets loaded first.
	 *
	 * @return {Promise<Tournament>} A promise to a tournament.
	 */
	static fetchActiveTournament() {
		return shen.db.fetchActiveTournamentID()
			.then(tournamentID => {
				return shen.db.fetchTournament(tournamentID);
			});
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

	//endregion//

	//region// User Functions //////////////////////////////////////////////////

	/**
	 * Returns a User by their userID. If it doesn't exist, then a new
	 * User will be created.
	 *
	 * @returns User
	 */
	static findOrCreateUser(userID) {
		return shen.db.fetchUser
	}
	static fetchUser(userid) {
		return shen.db.fetchUser(userid).then(users => {
			if(users.length == 0) // user doesn't exist
				throw new ReferenceError("This user does not exist.");
			return users[0];
		});
	}

	static fetchUserFromDiscordID(discordID) {
		return shen.db.fetchUserFromDiscordID(discordID);
	}

	static fetchUsers(userIds) {
		return shen.db.fetchUser(userIds);
	}

	static addUser(userid) {
		return shen.db.addUser(userid);
	}

	//endregion//

	//region// Object Constructors /////////////////////////////////////////////

	/**
	 * Constructs a new User object.
	 *
	 * @returns {User} a new User object
	 */
	static User(data) { return new User(data); }

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

	//endregion//

	static bestOf(n, scores) {
		//var odd = n % 2; // if odd is 1, then a tie is impossible
		var scoreToWin = Math.ceil(n / 2);
		var winners = [];
		Object.keys(scores).forEach((userid) => {
			if(scores[userid] >= scoreToWin) {
				winners.push(userid);
			}
		});
		return winners;
	}

	/**
	 * Returns the argument if it is already an array, but converts it into
	 * an array containing the argument otherwise.
	 *
	 * @param {*|Array} a value of any type or an array of any type
	 *
	 * @returns {Array} an array equal to the array provided, or a new array containing the provided value
	 */
	static toArray(a) {
		if(a instanceof Array) { return a; }
		return [a];
	}

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
		a.forEach((_v, k) => { if(k in b) a[k] = b[k]; });
	}

	/**
	 * Checks a userID to see if it is valid.
	 * UserIDs come in the form "<username>#<discriminator>", where
	 * the username can only be alphanumeric, and
	 * the disciminator can only be numeric.
	 *
	 * @returns {boolean} true if the userID is valid
	 */
	static checkNametag(nametag) {

		if(!nametag.includes("#")) return false;

		let split = nametag.split("#");
		let username = split[0];
		let tag = split[1];

		if(username.match("^[0-9a-zA-Z_]*$") == null) return false;
		if(tag.match("^[0-9]*$") == null) return false;

		return true;
	}
}

module.exports = Shen;

/**
 * Returns the current instance of the API.
 *
 * @return {Shen} The API.
 */
module.exports.shen = () => { return Shen.instance; };

