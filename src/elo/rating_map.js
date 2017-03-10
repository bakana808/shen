
var shen = require("../shen");

/**
 * Represents a map of values that is based on a range of numbers rather than
 * one value as the key. This type of map will only accept numbers as keys.
 *
 * For example, you could set a value at key = 0 and another value at key = 10.
 * An attempt to get a value at key = 5 would default to getting the value at
 * key = 0 (rounds down).
 */
class RangeMap {
	constructor(obj) {
		this.obj = obj;
	}

	get(rating) {
		if(typeof this.obj === "number") {
			return this.obj;
		}
		if(typeof this.obj === "object") {
			var keys = Object.keys(this.obj);
			var value = this.obj["0"];
			//Logger.log("elo", "keys = " + keys);
			keys.sort((a, b) => { return a - b; });
			keys.forEach((key) => {
				//console.log("rating = " + rating + " key = " + key);
				if(+rating >= +key) {
					value = this.obj[key];
				}
			});
			//Logger.log("elo", "rating = " + rating + ", got value " + value);
			return value;
		}
	}
}

module.exports = RangeMap;
