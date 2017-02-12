
var Options = require("../util/options");
var User    = require("../user");
var Ranker  = require("../ranker");

/**
 * Represents user statistics for a tournament at a given time.
 */
class UserStatistics {
	/**
	 * @param {object} obj              The parameter object.
	 * @param {number} obj.totalMatches The total number of matches this user has played.
	 * @param {number} obj.wins         The total wins this user has.
	 * @param {number} obj.rating       The current skill rating of this player.
	 */
	constructor(obj = {}) { obj = this.__verifyObject(obj);
		/**
		 * The user these statistics are for.
		 * @type {User}
		 */
		Object.defineProperty(this, "user", {value: obj.user});
		/**
		 * The matches this user has played.
		 * @type {Match[]}
		 */
		Object.defineProperty(this, "matches", {value: obj.matches});
		/**
		 * The total wins this user has.
		 * @type {User[]}
		 */
		Object.defineProperty(this, "wins", {value: obj.wins});

		// elo-related properties
		/**
		 * The current skill rating of the player.
		 * @type {Gametype}
		 */
		Object.defineProperty(this, "ranker", {value: obj.ranker});
		/**
		 * The current skill rating of the player.
		 * @type {Gametype}
		 */
		Object.defineProperty(this, "rating", {value: obj.rating});

		console.log(this.matches);
	}

	// shortcut getter to get win ratio (0 to 1 inclusive).
	// If the player has no matches, returns 0.
	get winrate() { return this.matches.length != 0 ? this.wins / this.matches.length : 0; }

	// shortcut getter to get losses instead of wins
	get losses() { return this.matches.length - this.wins; }

	// TODO: move to own class
	get division() {
		if(this.rating >= 1100) return "S";
		if(this.rating >= 1000) return "A";
		if(this.rating >= 950) return "B";
		return "C";
	}

	/**
	 * Adjusts this user's rating by an amount. Returns a new instance of
	 * UserStatistics.
	 *
	 * @param  {type} diff description
	 * @returns {type}      description
	 */
	adjustRating(diff) {
		console.log("adjusting rating of " + this.user.nickname + ", matches: " + this.matches);
		if(isNaN(diff))
			throw new ReferenceError("Rating adjustment is not a number, got " + diff);
		return new UserStatistics({
			user:         this.user,
			matches:      this.matches,
			wins:         this.wins,
			ranker:       this.ranker,
			rating:       this.rating + diff
		});
	}

	/**
	 * Increments the total matches of this user. Returns a new instance of
	 * UserStatistics.
	 */
	addMatch(match, standings) {
		console.log("added match to stats of " + this.user.nickname + ", matches: " + this.matches);
		var stats = this.ranker.adjust(this, match, standings);
		return new UserStatistics({
			user:         stats.user,
			matches:      stats.matches.concat([match]),
			wins:         stats.wins,
			ranker:       stats.ranker,
			rating:       stats.rating
		});
	}

	/**
	 * Increments the total wins of this user. Returns a new instance of
	 * UserStatistics.
	 */
	incrementWins() {
		//Logger.log(`Win count of Player (id=${ this.userId }) incremented. (${ this.totalMatches + 1})`);
		return new UserStatistics({
			user:         this.user,
			matches:      this.matches,
			wins:         this.wins + 1,
			ranker:       this.ranker,
			rating:       this.rating
		});
	}

	__verifyObject(obj) {
		obj = Options.merge({
			user:         null,
			matches:      [],
			wins:         0,
			rating:       null,
			ranker:       null
		}, obj);

		if(obj.user == null || !(obj.user instanceof User)) {
			throw new ReferenceError("\"user\" value is not an instance of User.");
		}

		if(!(obj.matches instanceof Array)) {
			throw new ReferenceError("Matches is not an array. Got " + obj.matches);
		}

		if(isNaN(obj.wins)) {
			throw new ReferenceError("Total matches is not a number.");
		}

		if(obj.ranker == null || !(obj.ranker instanceof Ranker)) {
			throw new ReferenceError("Ranker is not an instance of Ranker.");
		} else {
			// set rating to ranker's initial rating if null
			if(obj.rating == null) obj.rating = obj.ranker.initial;
		}

		if(isNaN(obj.rating)) {
			throw new ReferenceError("Rating is not a number, got " + obj.rating);
		}

		return obj;
	}
}

module.exports = UserStatistics;
