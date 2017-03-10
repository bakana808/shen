
var Identifiable = require("./identifiable");

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
class Game extends Identifiable {

	constructor(options = {}) { super(options);
		options = Object.assign({
			title: options.id,
			compatabilities: ["character", "stage"],
			characters: {},
			stages: {},
		}, options);
		// defaults

		this._rulesets = {
			"1v1": new Ruleset("1v1", {})
		};

		/**
		 * An array of attributes that this game supports. For example, a game
		 * that has different characters would have "character" has a compatabilty.
		 * @type {string[]}
		 */
		Object.defineProperty(this, "compatabilities", {value: options.compatabilities});
		/**
		 * The title of this game.
		 * @type {string}
		 */
		Object.defineProperty(this, "title", {value: options.title});
		/**
		 * The avaliable pickable characters in this game, if the game has
		 * different characters.
		 * @type {object}
		 */
		Object.defineProperty(this, "characters", {value: options.characters});
		/**
		 * The avaliable pickable stages / maps in this game, if the game has
		 * different stages.
		 * @type {object}
		 */
		Object.defineProperty(this, "stages", {value: options.stages});
	}

	//getTitle() { return this.title; }

	getRulesets() {
		return Object.keys(this._rulesets);
	}

	getRuleset(ruleset) {
		return this._rulesets[ruleset];
	}
}

module.exports = Game;
