
/**
 * Represents an object that can be identified by a string or a number.
 */
class Identifiable {
	constructor(options = {}) {
		if(!(typeof options.id == "string") && !(typeof options.id == "number")) {
			throw new TypeError("ID of object must be either a string or a number.");
		}

		/**
		 * The identifier for this object.
		 * @type {string} | {number}
		 */
		Object.defineProperty(this, "id", {value: options.id});
	}
}

module.exports = Identifiable;
