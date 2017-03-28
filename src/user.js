
var Logger = require("./util/logger");
/**
 * This class represents a single user account on our service.
 */
module.exports = class User {
	constructor(options) {
		this.id = null;
		this.nickname = null;

		if(typeof options === "object") {
			if("id" in options) { this.id = options.id; }
			if("nickname" in options) { this.nickname = options.nickname; }
		}

		if(options instanceof User) { // copy constructor
			this.id = options.id;
			this.nickname = options.nickname;
		}

		if(this.id == null) {
			throw ReferenceError("User ID cannot be null.");
		}

		Object.freeze(this);
	}

	/**
	 * Checks if this user is in the provided array of users.
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

	equals(user) {
		if(user == null) return false;
		return (user.id == this.id) && (user.nickname == this.nickname);
	}

	toString() { return "[" + this.id + "] " + this.nickname; }

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

	// get id() { return this.id; }
	// get nickname() { return this._nickname != null ? this._nickname : "unnamed user"; }
};
