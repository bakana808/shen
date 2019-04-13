
const logger = new (require("./util/logger"))();

const Match = require("./match");
const Round = require("./round");

/**
 * Contains all the basic API functions of this application.
 */
class ShenAPI {

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

		/**
		 * An array containing automatically loaded Gametitles.
		 * Usually Gametitles should be loaded from the database.
		 *
		 * @type {Map<Gametitle>}
		 */
		this.gametitles = new Map();

		this.tournaments = new Map();

		if(ShenAPI.singleton) {
			logger.warn("tried to create a new API instance; one already exists");
		} else {
			ShenAPI.singleton = this;
		}
	}

	//==========================================================================
	// TOURNAMENT METHODS
	//==========================================================================

	/**
	 * Adds a new Gametitle.
	 *
	 * @param {string}    slug      A slug used to refer to the gametitle.
	 * @param {Gametitle} gametitle The gametitle to add.
	 * @return {void}
	 */
	addGametitle(slug, gametitle)
	{
		this.gametitles.set(slug, gametitle);

		logger.info(`added gametitle "${ gametitle.title }" (${ slug })`);
	}

	async getGametitle(slug)
	{
		if(this.gametitles.has(slug))
		{
			return this.gametitles.get(slug);
		}

		return null;
	}

	/**
	 * Adds a tournament, using an object containing data about the tournament.
	 *
	 * @param {string} slug A slug used to refer to the tournament.
	 * @param {Object} options Information about the tournament.
	 * @param {string} options.title The name of the tournament.
	 * @param {User[]} options.users The users in this tournament.
	 * @param {string} options.game  The slug of the gametitle that this tournament is for.
	 */
	addTournament(slug, options)
	{
	
	}

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

	//==========================================================================
	// USER METHODS
	//==========================================================================

	/**
	 * Returns a User by their tag.
	 *
	 * @param {string} tag The User's tag
	 *
	 * @returns {Promise<User>} The User that was found, or null
	 */
	async getUser(tag) {

		return this.db.getUser(tag);
	}

	/**
	 * Returns a User by their UUID.
	 *
	 * @param {string} uuid The User's UUID
	 *
	 * @returns {Promise<User>} The User that was found, or null
	 */
	async getUserByID(uuid) {

		return this.db.getUserByID(uuid);
	}

	/**
	 * Searches for users partially matching the name provided.
	 *
	 * @param {string} partial A partial search term for a User's name
	 *
	 * @returns {Promise<User[]>} An array of Users matching the partial term
	 */
	async searchUsers(partial) {

		return this.db.findUsers(partial);
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

	// MATCH METHODS
	//==========================================================================
	
	/**
	 * Retrieves a match by its ID.
	 *
	 * @param {string} id The ID of the match.
	 *
	 * @returns {Promise<Match?>} The retrieved match.
	 */
	async getMatch(id) {

		return this.db.getMatch(id);
	}

	/**
	 * Retrieves a round by its ID.
	 *
	 * @param {string} id The ID of the round.
	 *
	 * @returns {Promise<Round?>} The retrieved round.
	 */
	async getRound(id) {

		return this.db.getRound(id);
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

	//==========================================================================
	// TOURNAMENT METHODS
	//==========================================================================
	
	/**
	 * Retrieves a tournament by its ID.
	 *
	 * @param {string} id The ID of the tournament (a number)
	 *
	 * @returns {Promise<Tournament>}
	 */
	async getTournament(id) {


	}

	//==========================================================================
	// UTILITY METHODS
	//==========================================================================
	
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
		if(tag.match("^[0-9]{4}$") == null) return false;

		return true;
	}
}

/**
 * Waits until every component is ready to use, then resolves.
 *
 * @returns {void}
 */
async function init(data) {

	let shen = new ShenAPI(data);

	await shen.bot.connect();

	ShenAPI.singleton = shen;
}
/**
 * Returns the current instance of the API.
 *
 * @return {ShenAPI} The API.
 */
function shen() {

	if(ShenAPI.singleton) {

		return ShenAPI.singleton;
	}
	else {

		throw new ReferenceError("Cannot get API. Initialize it first.");
	}
}

module.exports      = ShenAPI;
module.exports.init = init;
module.exports.shen = shen;

