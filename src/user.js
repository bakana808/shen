
const chalk = require("chalk");

/**
 * Represents a user on Shen.
 */
class User {
	
	/**
	 * Constructs a user.
	 *
	 * @param {Object} data               Information about the user.
	 * @param {string} data.id            The user's UUID.
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
		this.id = data.id;

		/**
		 * The username of the user.
		 *
		 * @type {string}
		 */
		this.name = data.name;

		/**
		 * The discriminator of this user, a 4-digit numerical string.
		 * This is used to allow users with the same name to differentiate
		 * themselves without exposing their UUID.
		 *
		 * @type {string}
		 */
		this.discriminator = data.discriminator;
	}

	/**
	 * Returns the tag of this user,
	 * a combination of their name and their discriminator.
	 *
	 * @returns {string} The tag of this user.
	 */
	get tag() { return this.name + "#" + this.discriminator; }

	/**
	 * Checks if this user is equal to another user.
	 *
	 * @param {User} user The user to check against.
	 *
	 * @returns {boolean} True if these users are equal.
	 */
	equals(user) {
		if(user === null) return false;

		let cond1 = (user.id === this.id);
		//Logger.info(`${user.uuid} === ${this.uuid} (${cond1})`);

		let cond2 = (user.name === this.name);
		//Logger.info(`${user.name} === ${this.name} (${cond2})`);

		let cond3 = (user.discriminator === this.discriminator);
		//Logger.info(`${user.discriminator} === ${this.discriminator} (${cond3})`);

		return cond1 && cond2 && cond3;
	}

	/**
	 * @override
	 */
	toString() { return this.tag; }
}

module.exports = User;
