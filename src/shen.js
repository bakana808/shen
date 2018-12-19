
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

		/**
		 * An array containing automatically loaded Gametitles.
		 * Usually Gametitles should be loaded from the database.
		 *
		 * @type {Map<Gametitle>}
		 */
		this.gametitles = new Map();

		this.tournaments = new Map();

		if(Shen.instance) {
			logger.warn("tried to create a new API instance; one already exists");
		} else {
			Shen.instance = this;
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
	// USER METHODS
	//==========================================================================
	
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

module.exports = Shen;

/**
 * Returns the current instance of the API.
 *
 * @return {Shen} The API.
 */
module.exports.shen = () => { return Shen.instance; };

/**
 * Waits until every component is ready to use, then resolves.
 *
 * @returns {void}
 */
module.exports.init = async (data) =>
{
	let shen = new Shen(data);

	await shen.bot.connect();

	return shen;
};

