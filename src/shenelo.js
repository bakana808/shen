
var Elo =     require("./elo");
var Options = require("./util/options");
//var RangeMap = require("./rangemap");

/**
 * Represents a rating division. This is aimed at grouping players by similar
 * skill ratings.
 */
class Division {
	constructor(options) {
		Options.merge({
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
		 * The skill rating that a player has to reach to be in this division.
		 * @type {string}
		 */
		Object.defineProperty(this, "start", {value: options.start});
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

/**
 * Represents an extension to the Elo rating system by taking into account
 * rating divisions and various other things specific to Shen's ranking system.
 */
class ShenElo {
	constructor(options = {}) {
		Options.merge({
			floor: 500,
			divisions: [
				new Division({name: "C", start: 0,    k: 60, gain: 1.5, loss: 0.5}),
				new Division({name: "B", start: 950,  k: 70}),
				new Division({name: "A", start: 1000, k: 70}),
				new Division({name: "S", start: 1100, k: 80, loss: 1.5})
			]
		}, options);
		// sort the divisions array first by starting ratings
		options.divisions.sort((a, b) => { return a.start - b.start; });
		/**
		 * The Elo instance, which handles all basic Elo functions.
		 * @type {Elo}
		 */
		Object.defineProperty(this, "elo", {value: new Elo()});
		/**
		 * The rating "floor". Rating adjustments will never set a user's
		 * rating lower than this value.
		 * @type {number}
		 */
		Object.defineProperty(this, "floor", {value: options.floor});
		Object.defineProperty(this, "divisions", {value: options.divisions});
	}

	/**
	 * Gets the division at this rating.
	 *
	 * @param  {type} rating description
	 * @returns {type}        description
	 */
	getDivision(rating = 0) {
		var match = null; // the division to use
		this.divisions.forEach(division => {
			// use this division if the rating is at least the start of the division
			if(rating >= division.start) match = division;
		});
		return match;
	}

	/**
	 * Adjusts the given user statistics given a match.
	 *
	 * @param  {type} stats description
	 * @param  {type} score description
	 * @returns {type}       description
	 */
	adjust(stats, match) {
		if(!match.hasUser(stats.user)) {
			throw new ReferenceError("This match does not contain this user: " + stats.user.nickname);
		}

		//== new player rule ==//
		var bonus = 1.0;
		if(stats.totalMatches <= 3) { // if this match is one of the first three matches, give a bonus.
			bonus = 2.0;
		}

		stats = stats.incrementTotalMatches();

		var division = this.getDivision(stats.rating);
		var opponent = match.getOpponents(stats.user)[0];
		var opponentRating = this.getStats(opponent);

		if(match.isWinner(stats.user)) { // user won
			stats = stats.incrementWins();
			// get rating adjustment using Elo
			stats = stats.adjustRating(Math.ceil(this.elo.adjust(stats.rating, opponentRating, 1, division.k) * division.gain * bonus));
		} else { // user lost
			stats = stats.adjustRating(Math.ceil(this.elo.adjust(stats.rating, opponentRating, 0, division.k) * division.loss * bonus));
		}

		return stats;
	}
}

module.exports = ShenElo;
