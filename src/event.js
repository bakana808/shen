
var Options = require("./util/options");
/**
 * Represents something that happens throughout a tournament. For example,
 * matches or rating algorithm changes can be considered an event.
 *
 * All events should have the id and time of the event as a property.
 */
class Event {
	constructor(obj) { this.__verifyObject(obj);
		/**
		 * The identifier for the event.
		 * @type {string}
		 */
		Object.defineProperty(this, "id", {value: obj.id});
		/**
		 * The time of the event, in UNIX.
		 * @type {number}
		 */
		Object.defineProperty(this, "time", {value: obj.time});
	}

	__verifyObject(obj) {
		obj = Options.merge({
			type: null, // the type of event
			id:   null, // the id of this event
			time: null  // the time this event occured
		}, obj);

		if(obj.id == null) {
			throw new ReferenceError("The ID cannot be null.");
		}
		if(isNaN(obj.time) || obj.time < 0) {
			throw new RangeError("The provided time for this event is invalid: " + obj.time);
		}
	}
}

module.exports = Event;
