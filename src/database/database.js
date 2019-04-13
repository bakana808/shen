
/**
 * An abstract class that describes what functions a database should implement.
 *
 * @abstract
 */
class Database {
	
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
	addUser(_name, _dscr) {

		throw new Error("not implemented");
	}

	/**
	 * Returns a User by their tag.
	 *
	 * @param {string} _tag The User's tag
	 *
	 * @returns {Promise<User?>} The User, or null
	 */
	getUser(_tag) {

		throw new Error("not implemented");
	}

	/**
	 * Returns a single User by a UUID, or multiple Users by an array of UUIDs.
	 *
	 * @param {string|string[]} _uuid The User's UUID, or an array of UUIDs.
	 *
	 * @returns {Promise<User?>} The User, or null
	 */
	getUserByID(_uuid) {

		throw new Error("not implemented");
	}

	/**
	 * Returns a single User using information from a linked account.
	 *
	 * @param {object} _options         The User's linked account info
	 * @param {string} _options.discord The User's Discord ID
	 *
	 * @returns {Promise<User?>} The User, or null
	 */
	getUserByLink(_options) {

		throw new Error("not implemented");
	}

	/**
	 * Finds users matching a partial name.
	 *
	 * @param {string} _partial The partial name of the user.
	 *
	 * @returns {Promise<User[]>} The users that match this partial name.
	 */
	searchUsers(_partial) {

		throw new Error("not implemented");
	}

	/**
	* Links a user to a Discord ID.
	*
	* @param {string} _uuid            The UUID of the User.
	* @param {object} _options         Data containing information about what accounts to link.
	* @param {string} _options.discord The ID of a Discord account to link.
	*
	* @returns {Promise<User>} The user (after linking)
	*/
	linkUser(_uuid, _options) {

		throw new Error("not implemented");
	}

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
	 * @return {number} The ID of the inserted match.
	 */
	openMatch(_mb) {

		throw new Error("not implemented");
	}

}

module.exports = Database;

