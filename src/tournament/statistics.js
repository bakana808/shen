
var Options = require("../util/options");
var User    = require("../user");

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
		/**
		 * The current skill rating of the player.
		 * @type {Gametype}
		 */
		Object.defineProperty(this, "rating", {value: obj.rating});
		/**
		 * The sum of all the positive rating adjustments.
		 * @type {number}
		 */
		Object.defineProperty(this, "points", {value: obj.points});
		//console.log(this.matches);
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
	 * Adjusts this user's skill rating by an amount.
	 * Returns a new instance of UserStatistics.
	 *
	 * @param  {number} diff     The amount to adjust by.
	 * @returns {UserStatistics} A new instance of UserStatistics.
	 */
	adjustRating(diff) {
		if(isNaN(diff))
			throw new ReferenceError("Rating adjustment is not a number, got " + diff);
		return new UserStatistics({
			user:         this.user,
			matches:      this.matches,
			wins:         this.wins,
			rating:       this.rating + diff,
			points:       this.points,
		});
	}
	/**
	 * Adjust this user's points.
	 * Returns a new instance of UserStatistics.
	 *
	 * @param  {number} diff    The amount to adjust by.
	 * @return {UserStatistics} A new instance of UserStatistics.
	 */
	adjustPoints(diff) {
		if(isNaN(diff))
			throw new ReferenceError("Points is not a number, got " + diff);
		return new UserStatistics({
			user:         this.user,
			matches:      this.matches,
			wins:         this.wins,
			rating:       this.rating,
			points:       this.points + diff,
		});
	}
	/**
	 * Pushes a matches to the list of matches that this user was involved in.
	 * Returns a new instance of UserStatistics.
	 *
	 * @returns {UserStatistics} A new instance of UserStatistics.
	 */
	pushMatch(match) {
		return new UserStatistics({
			user:         this.user,
			matches:      this.matches.concat([match]),
			wins:         this.wins,
			rating:       this.rating,
			points:       this.points
		});
	}
	/**
	 * Increments the total wins of this user.
	 * Returns a new instance of UserStatistics.
	 *
	 * @returns {UserStatistics} A new instance of UserStatistics.
	 */
	incrementWins() {
		return new UserStatistics({
			user:         this.user,
			matches:      this.matches,
			wins:         this.wins + 1,
			rating:       this.rating,
			points:       this.points
		});
	}

	__verifyObject(obj) {
		obj = Options.merge({
			user:         null,
			matches:      [],
			wins:         0,
			rating:       null,
			points:       null,
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
		if(isNaN(obj.rating)) {
			throw new ReferenceError("Rating is not a number, got " + obj.rating);
		}
		if(isNaN(obj.points)) {
			throw new ReferenceError("Points is not a number, got " + obj.rating);
		}

		return obj;
	}
}

module.exports = UserStatistics;
