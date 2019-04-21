
// @ts-check

const logger = new (require("./util/logger"))();
import DiscordBot from "./discord/bot";

import { Database } from "./database/database";
import CommandListener from "./cmd/listener";

import Server from "./server/server";

import Game       from "./gametype";
import User       from "./user";
import MatchSet   from "./set";
import Match      from "./match";
import Tournament from "./tournament";

interface ShenApiInitOptions {

	database: Database;
	commands: CommandListener;
	bot:      DiscordBot;
}

interface ShenApiOptions extends ShenApiInitOptions {

	server: Server;
}

/**
 * Contains all the basic API functions of this application.
 */
export default class ShenAPI {

	static singleton: ShenAPI;

	public db: Database;
	public cl: CommandListener;
	public server: Server;
	public bot: DiscordBot;

	public gametitles:  Map<string, Game>;
	public tournaments: Map<string, Tournament>;

	/**
	 * Constructs the central API object.
	 *
	 * @param {Object}          data        The components of the API.
	 * @param {Database}        data.db     The database.
	 * @param {CommandListener} data.cl     The command listener.
	 * @param {http.Server}     data.server The server.
	 * @param {DiscordBot}      data.bot    The discord bot.
	 */
	public constructor(data: ShenApiOptions) {

		this.db = data.database;

		this.cl = data.commands;

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
	// USER METHODS
	//==========================================================================
	
	/**
	 * Creates a new user.
	 *
	 * @param {string} name          The name of the user
	 * @param {string} discriminator The discriminator of the user, a 4-digit number
	 *
	 * @returns {Promise<User>} The user that was created
	 */
	public async addUser(name: string, discriminator?: string): Promise<User> {

		return this.db.addUser(name, discriminator);
	}

	/**
	 * Returns a User by their tag.
	 *
	 * @param {string} tag The User's tag
	 *
	 * @returns {Promise<User>} The User that was found, or null
	 */
	async getUser(tag): Promise<User> {

		return this.db.getUser(tag);
	}

	/**
	 * Returns a User by their UUID.
	 *
	 * @param {string|string[]} uuid The User's UUID
	 *
	 * @returns {Promise<User|User[]>} The User that was found, or null
	 */
	async getUserByID(uuid): Promise<User|User[]> {

		return this.db.loadUsersByID(uuid);
	}

	async getUserByLink(options): Promise<User> {

		return this.db.getUserByLink(options);
	}

	/**
	 * Searches for users partially matching the name provided.
	 *
	 * @param {string} partial A partial search term for a User's name
	 *
	 * @returns {Promise<User[]>} An array of Users matching the partial term
	 */
	async searchUsers(partial): Promise<User[]> {

		return this.db.searchUsers(partial);
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
	public addGametitle(slug, gametitle): void
	{
		this.gametitles.set(slug, gametitle);

		logger.info(`added gametitle "${ gametitle.title }" (${ slug })`);
	}

	public async getGame(slug): Promise<Game>
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
	async addTournament(_slug, _options): Promise<Tournament>
	{
		throw new Error("not yet implemented");
	}

	// MATCH METHODS
	//==========================================================================
	
	/**
	 * Creates an empty set. Its ID will be automatically selected
	 * by the database.
	 *
	 * @returns {MatchSet} A new set.
	 */
	async createSet(): Promise<MatchSet> {
		
		//var time = (new Date());

		throw new Error("not yet implemented");
	}
	
	/**
	 * Retrieves a match by its ID.
	 *
	 * @param {string} id The ID of the match.
	 *
	 * @returns {Promise<TournySet?>} The retrieved match.
	 */
	async loadSet(id): Promise<MatchSet> {

		return this.db.loadSet(id);
	}

	async createMatch(): Promise<Match> {

		throw new Error("not yet implemented");
	}

	/**
	 * Retrieves a round by its ID.
	 *
	 * @param {string} id The ID of the round.
	 *
	 * @returns {Promise<TournyMatch?>} The retrieved round.
	 */
	async loadMatch(id): Promise<Match> {

		return this.db.loadMatch(id);
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
	async loadTournament(id): Promise<Tournament> {

		throw new Error("not yet implemented");
	}

	//==========================================================================
	// UTILITY METHODS
	//==========================================================================
	
	static bestOf(n, scores): string[] {

		//var odd = n % 2; // if odd is 1, then a tie is impossible
		var scoreToWin = Math.ceil(n / 2);
		var winners = [];

		for(const userid in scores) {

			if(scores[userid] >= scoreToWin) {
				winners.push(userid);
			}
		}

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
	static toArray<T>(a: T|T[]): T[] {

		if(a instanceof Array) { return a; }
		return [a];
	}

	/**
	 * @deprecated
	 * Merges two option objects a and b, where b overwrites a.
	 *
	 * @return {object} the merged options object
	 */
	static mergeOptions(a: object , b: object): void {
		if(typeof a !== "object") {
			throw new TypeError("Default options is not an object.");
		}
		if(typeof b !== "object") {
			throw new TypeError("Options is not an object.");
		}

		for(const key in a) { if(key in b) { a[key] = b[key]; } }
	}

	/**
	 * Checks a userID to see if it is valid.
	 * UserIDs come in the form "<username>#<discriminator>", where
	 * the username can only be alphanumeric, and
	 * the disciminator can only be numeric.
	 *
	 * @param {string} nametag The tag of the user to check
	 *
	 * @returns {boolean} true if the userID is valid
	 */
	static checkNametag(nametag: string): boolean {

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
export async function init(options: ShenApiInitOptions): Promise<void> {

	(options as ShenApiOptions).server = await Server.start();

	let shen = new ShenAPI(options as ShenApiOptions);

	await shen.bot.connect();

	ShenAPI.singleton = shen;
}
/**
 * Returns the current instance of the API.
 *
 * @return {ShenAPI} The API.
 */
export function shen(): ShenAPI {

	if(ShenAPI.singleton) {

		return ShenAPI.singleton;
	}
	else {

		throw new ReferenceError("Cannot get API. Initialize it first.");
	}
}
