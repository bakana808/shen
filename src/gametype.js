
class Ruleset {
	constructor(name, rules) {
		this.name = "Untitled Ruleset";

		if(typeof rules === "object") {
			this.rules = rules;
		} else {
			this.rules = {};
		}
	}
}
/**
 * This class represents a game, and the type of stats
 * and rules that are supported for it.
 */
module.exports = class Gametype {

	constructor(id, options) {

		// defaults
		this.id = id;
		this.title = id;
		this._rulesets = {
			"1v1": new Ruleset("1v1", {})
		};

		if(typeof options === "object") {

			if("title" in options) { this.title = options.title; }
		}

	}

	getTitle() { return this.title; }

	getRulesets() {
		return Object.keys(this._rulesets);
	}

	getRuleset(ruleset) {
		return this._rulesets[ruleset];
	}
};
