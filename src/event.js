
//var Options = require("./util/options");
var Identifiable = require("./identifiable");

/**
 * Represents something that happens throughout a tournament. For example,
 * matches or rating algorithm changes can be considered an event.
 *
 * All events should have the id and time of the event as a property.
 */
class Event extends Identifiable {
	constructor(options = {}) { super(options);
		if(isNaN(options.time) || options.time < 0) {
			throw new RangeError("The provided time for this event is invalid: " + options.time);
		}
		/**
		 * The identifier for the event.
		 * @type {string}
		 */
		Object.defineProperty(this, "id", {value: options.id});
		/**
		 * The time of the event, in UNIX.
		 * @type {number}
		 */
		Object.defineProperty(this, "time", {value: options.time});
	}

	// __verifyObject(options) {
	// 	options = Options.merge({
	// 		type: null, // the type of event
	// 		id:   null, // the id of this event
	// 		time: null  // the time this event occured
	// 	}, options);
	//
	// 	if(isNaN(options.time) || options.time < 0) {
	// 		throw new RangeError("The provided time for this event is invalid: " + options.time);
	// 	}
	// }
}

module.exports = Event;
