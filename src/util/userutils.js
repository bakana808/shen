
const Logger = require("./logger");

/**
 * Finds a certain user in an array of users.
 * Returns true if that user is in the array.
 *
 * @param {User}   user    The user to check.
 * @param {User[]} users[] The array of users to use.
 *
 * @returns {boolean} True if this user is in the array.
 */
module.exports.findUserIn = function(user, users) {

	var pass = false;
	users.forEach(other => {
		//Logger.info(`testing ${ user } == ${ other }`);
		if(user.equals(other)) {
			//Logger.info("true");
			pass = true; return false; // set true and break
		}
		//Logger.info("false");
	});
	return pass;
};

/**
 * Finds a user in an array by their nametag.
 * Returns that user if it exists, null if not.
 *
 * @param {string} nametag The nametag of the user.
 * @param {User[]} users[] The array of users.
 *
 * @returns {?User} The user that was found.
 */
module.exports.findOne = function(tag, users) {

	var found_user = null;
	users.forEach(user => {
		if(user.tag == tag) {
			found_user = user; return false;
		}
	});
	return found_user;
};
