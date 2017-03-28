
var Elo =     require("./elo");
var Options = require("./util/options");
var RangeMap = require("./rangemap");
var Division = require("./tournament/skillgroup");

/**
 * Represents an extension to the Elo rating system by taking into account
 * rating divisions and various other things specific to Shen's ranking system.
 */
class Ranker {
	constructor(options = {}) {
		options = Options.merge({
			floor:   950,
			initial: 1000, // the initial rating for users
			divisions: new RangeMap({
				0:    new Division({name: "C", k: 48}),
				1000: new Division({name: "B", k: 32}),
				1050: new Division({name: "A", k: 24}),
				1100: new Division({name: "S", k: 16})
			})
		}, options);
		// sort the divisions array first by starting ratings
		//options.divisions.sort((a, b) => { return a.start - b.start; });

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
		Object.defineProperty(this, "initial", {value: options.initial});
		Object.defineProperty(this, "divisions", {value: options.divisions});
	}

	/**
	 * @deprecated
	 * Gets the division at this rating.
	 *
	 * @param  {type} rating description
	 * @returns {type}        description
	 */
	getDivision(rating = 0) {
		let division = this.divisions.get(rating);
		//console.log(`Rating ${rating} => Division ${division.name}`);
		return division;
	}

	/**
	 * Returns the skill group that this skill rating translates to.
	 *
	 * @param  {Number} [ rating = 0 ] The skill rating of an entrant.
	 * @return {Division}              The skill group.
	 */
	getSkillGroup(rating = 0) {
		return this.divisions.get(rating);
	}

	/**
	 * Processes a match. This function should modify the current tournament snapshot as needed
	 * then return a new one.
	 *
	 * @param  {[type]} standings [description]
	 * @param  {[type]} user      [description]
	 * @param  {[type]} match     [description]
	 * @return [type]             [description]
	 */
	processMatch(standings, match) {
		var newStandings = standings;
		match.users.forEach(user => {
			let effectiveK = 0;                               // the k-factor to use (in case it changes later)
			let adjustment = 0;                               // the SR adjustment
			let stats      = standings.getEntrantStats(user);
			let opponent   = match.getOpponents(user)[0];
			let opponentSR = standings.getEntrantStats(opponent).rating;
			let skillGroup;                                   // the skill group of the user

			//console.log(`${user.nickname}: ${stats.rating} - ${opponentSR}`);

			// placement match check ///////////////////////////////////////////
			if(stats.matches.length < 3) {
				// use a static skill group for skill group placement
				skillGroup = new Division({ name: "Hidden", start: 0, k: 40 });
			} else {
				skillGroup = this.getSkillGroup(stats.rating);
			}
			effectiveK = skillGroup.k;


			// calculate SR adjustments ////////////////////////////////////////
			let score = 0;
			if(match.isWinner(stats.user)) {
				stats = stats.incrementWins();
				score = 1;

				// k-factor boost - checks if a property exists in the db //////
				if("win-k" in match.obj) {
					// boost the current K-factor 150%
					effectiveK = effectiveK * 1.50;
				}
			}

			adjustment = Math.ceil(Elo.adjust(stats.rating, opponentSR, score, effectiveK));

			if(stats.matches.length > 3 && adjustment > 0) {
				stats = stats.adjustPoints(adjustment);
			}

			// SR floor check //////////////////////////////////////////////////
			if(stats.rating + adjustment < this.floor) {
				adjustment = this.floor - stats.rating;
			}

			// apply SR adjustments ////////////////////////////////////////////
			stats = stats.adjustRating(adjustment);
			stats = stats.pushMatch(match);

			newStandings = newStandings.setEntrantStats(user, stats);
		});
		return newStandings;
	}
}

module.exports = Ranker;
