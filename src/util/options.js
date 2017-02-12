
class Options {
	/**
	 * Merges two option objects a and b, where b overwrites a.
	 * @return {object} the merged options object
	 */
	static merge(a, b) {
		if(typeof a !== "object") {
			throw new TypeError("Default options is not an object.");
		}
		if(typeof b !== "object") {
			throw new TypeError("Options is not an object.");
		}
		Object.getOwnPropertyNames(a).forEach(key => {
			if(key in b) a[key] = b[key];
		});
		return a;
	}

	static verify(a, b) {

	}
}

module.exports = Options;
