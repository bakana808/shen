
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
		this.obj  = obj;
		this.keys = Object.keys(this.obj);

		// retrieve default value from "0" or "default"
		if(this.keys.indexOf("0") > -1) {
			this.default = this.obj["0"];
		}
		if(this.keys.indexOf("default") > -1) {
			this.default = this.obj["default"];
		}

		// sort remaining keys numerically
		this.keys.sort((a, b) => { return a - b; });
	}

	get(key) {
		var value = this.default;
		if(this.keys.length == 0) {
			return value;

		} else {
			this.keys.forEach(startKey => {
				if(startKey != "0" && startKey != "default") {
					if((+key) >= (+startKey)) { value = this.obj[startKey]; }
				}
			});
		}

		return value;
	}
}

module.exports = RangeMap;
