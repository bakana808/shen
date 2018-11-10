
//const Logger = require("./util/logger");
const chalk = require("chalk");

/**
 * Represents a user on Shen.
 *
 * @class
 */
class User {
	
	/**
	 * Constructs a user.
	 *
	 * @param {Object} data               Information about the user.
	 * @param {string} data.uuid          The user's UUID.
	 * @param {string} data.name          The user's name.
	 * @param {string} data.discriminator The user's discriminator.
	 */
	constructor(data) {

		/**
		 * The UUID of the user.
		 *
		 * @type {string}
		 * @readonly
		 */
		Object.defineProperty(this, "uuid", { value: data.uuid, writable: false });

		/**
		 * The username of the user.
		 *
		 * @type {string}
		 * @readonly
		 */
		Object.defineProperty(this, "name", { value: data.name, writable: false });

		/**
		 * The discriminator of this user, a 4-digit numerical string.
		 * This is used to allow users with the same name to differentiate
		 * themselves without exposing their UUID.
		 *
		 * @type {string}
		 * @readonly
		 */
		Object.defineProperty(this, "discriminator", { value: data.discriminator, writable: false });
	}

	/**
	 * Returns the tag of this user,
	 * a combination of their name and their discriminator.
	 *
	 * @returns {string} The tag of this user.
	 */
	get tag() { return this.name + "#" + this.discriminator; }

	/**
	 * Returns a colored version of this user's tag.
	 * Not recommended to use anywhere other than the CLI.
	 *
	 * @returns {string} The colored tag of this user.
	 */
	get tagc() {
		return chalk.white(this.name) + chalk.gray("#" + this.discriminator);
	}

	/**
	 * Checks if this user is in the provided array of users.
	 *
	 * @deprecated Use (@link findUserIn) instead.
	 */
	in(users) {
		var pass = false;
		users.forEach(user => {
			if(user.equals(this)) {
				pass = true; return false; // set true and break
			}
		});
		return pass;
	}

	/**
	 * Checks if this user is equal to another user.
	 *
	 * @param {User} user The user to check against.
	 *
	 * @returns {boolean} True if these users are equal.
	 */
	equals(user) {
		if(user == null) return false;
		return (user.uuid == this.uuid)
			&& (user.name == this.name)
			&& (user.discriminator == this.discriminator);
	}

	static getUser(users, userId) {
		var found = null;
		users.forEach(user => {
			//Logger.info("comparing " + user.id + " == " + userId + " (" + (user.id == userId) + ")");
			if(user.id == userId) {
				found = user;
				return false; }
		});
		if(found == null) {
			throw new ReferenceError("The user with ID " + userId + " does not exist.");
		} else {
			return found;
		}

	}

	/**
	 * @override
	 */
	toString() { return this.tag(); }
}

module.exports = User;
