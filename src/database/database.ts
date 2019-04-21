
import User from "../user";
import MatchBuilder from "../matchbuilder";

/**
 * An abstract class that describes what functions a database should implement.
 */
export interface Database {
	
	/**
	 * Adds a new user.
	 * The name of the user must be a string of 32 characters or less.
	 * If a discriminator isn't provided, one will be generated randomly.
	 *
	 * @param {string} _name   the name of the user to create
	 * @param {string} [_dscr] the descriminator of the user
	 *
	 * @returns {Promise<User>} the user that was created
	 */
	addUser(name: string, dscr: string): Promise<User>;

	/**
	 * Returns a User by their tag.
	 *
	 * @param {string} _tag The User's tag
	 *
	 * @returns {Promise<User?>} The User, or null
	 */
	getUser(tag: string): Promise<User|null>;

	/**
	 * Returns a single User by a UUID, or multiple Users by an array of UUIDs.
	 *
	 * @param {string[]} _ids The User's UUID, or an array of UUIDs.
	 *
	 * @returns {Promise<User[]>} The User, or null
	 */
	loadUsersByID(...ids: string[]): Promise<User[]>;

	/**
	 * Returns a single User using information from a linked account.
	 *
	 * @param {object} _options         The User's linked account info
	 * @param {string} _options.discord The User's Discord ID
	 *
	 * @returns {Promise<User?>} The User, or null
	 */
	getUserByLink(_options): Promise<User|null>;

	/**
	 * Finds users matching a partial name.
	 *
	 * @param {string} _partial The partial name of the user.
	 *
	 * @returns {Promise<User[]>} The users that match this partial name.
	 */
	searchUsers(_partial): Promise<User[]>;

	/**
	* Links a user to a Discord ID.
	*
	* @param {string} _uuid            The UUID of the User.
	* @param {object} _options         Data containing information about what accounts to link.
	* @param {string} _options.discord The ID of a Discord account to link.
	*
	* @returns {Promise<User>} The user (after linking)
	*/
	linkUser(uuid: string, options): Promise<User>;


	// MATCH / ROUND DB METHODS
	//==========================================================================
	
	/**
	 * Inserts an empty match with base information.
	 * Returns the ID of the match that was inserted.
	 * Using this method on its own is not recommended. Use
	 * {@link MatchBuilder#open} instead.
	 *
	 * @param {MatchBuilder} _mb The match builder.
	 *
	 * @return {Promise<number>} The ID of the inserted match.
	 */
	openMatch(mb: MatchBuilder): Promise<number>;
}
