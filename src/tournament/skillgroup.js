
/**
 * Represents a rating division. This is aimed at grouping players by similar
 * skill ratings.
 */
class Division {
	constructor(options) {
		options = Object.assign({
			name: "NULL",
			start: 0,
			k:     40,
			gain:  1.0,
			loss:  1.0,
		}, options);
		/**
		 * The name of the division.
		 * @type {string}
		 */
		Object.defineProperty(this, "name", {value: options.name});
		/**
		 * The K-factor to use when in this division.
		 * @type {number}
		 */
		Object.defineProperty(this, "k", {value: options.k});
		/**
		 * Gain Multiplier - If a player wins a match while in this division,
		 * then the rating adjustment will be multiplied by this value.
		 * @type {number}
		 */
		Object.defineProperty(this, "gain", {value: options.gain});
		/**
		 * Loss Multiplier - If a player loses a match while in this division,
		 * then the rating adjustment will be multiplied by this value.
		 * @type {number}
		 */
		Object.defineProperty(this, "loss", {value: options.loss});
	}
}

module.exports = Division;
