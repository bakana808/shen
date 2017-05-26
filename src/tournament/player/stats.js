
class PlayerStatistics {
	constructor(player, rankings, data = {}) {
		/**
		 * The player that these statistics belongs to.
		 * @type {Player}
		 */
		this.player = player;
		/**
		 * The last match this player has played.
		 * @type {Match}
		 */
		this.lastMatch = null;

		// merge properties in data into these statistics
		Object.keys(data).forEach(key => {
			if(data[key] instanceof PlayerData) {
				this[key] = data[key];
			} else {
				delete data[key];
			}
		});

		/**
		 * An object containing all additional points of data.
		 * @type {object}
		 */
		this.data = data;

		Object.freeze(this.data);
		Object.freeze(this);
	}
	/**
	 * Executes a provided function that modifies the current data in this
	 * instance of player statistics and returns a new instance.
	 *
	 * The function takes one argument `data`.
	 *
	 * @returns {PlayerStatistics} A new instance of PlayerStatistics.
	 */
	modifyData(fn) {
		// copy data from these statistics into a new object
		let data = Object.assign({}, this.data);

		fn(data); // run function that might modify this data

		return new PlayerStatistics(this.player, this.rankings, data);
	}
	/**
	 * Returns a new instance of PlayerStatistics with a new number property
	 * with the provided name. By default, it will initialize to 0.
	 *
	 * @param property The name of the property to add.
	 * @param value    The value that this property should be initalized to.
	 *
	 * @returns {PlayerStatistics} A new instance of PlayerStatistics.
	 */
	number(property, value = 0) {
		if(Object.keys(this).indexOf(property) > -1) { // this instance already has this property
			throw new Error("These player statistics already has the property " + property);
		}

		return this.modifyData(data => {
			data[property] = new NumberData(this, property, value);
		});
	}
}

/**
 * Represents a point of data that relates to player statistics.
 */
class PlayerData {
	constructor(pstats, property) {
		/**
		 * The player statistics that this point of data belongs to.
		 * @type {PlayerStatistics}
		 */
		this.pstats = pstats;
		/**
		 * The name of the property that this data is assigned to.
		 * @type {string}
		 */
		this.property = property;
	}
	/**
	 * Shortcut method that runs pstats.modifyData().
	 * @returns {PlayerStatistics} A new instance of PlayerStatistics.
	 */
	modifyData(fn) {
		return this.pstats.modifyData(fn);
	}
}

/**
 * A point of data that tracks the matches this player has played, and calculates
 * common data such as number of wins and win ratio.
 */
class MatchData extends PlayerData {
	constructor(pstats, property, matches = []) { super(pstats, property);
		/**
		 * The current matches that this player has played.
		 * @type {Match[]}
		 */
		this.matches = matches;
		/**
		 * The amount of wins this player has (from the matches provided)
		 * @type {Number}
		 */
		this.wins = 0;

		// increment wins for each match the player has won
		matches.forEach(match => {
			if(match.isWinner(pstats.player)) { this.wins++; }
		});

		Object.freeze(this);
	}
	/**
	 * The amount of matches this player has played.
	 * @return {number} The amount of matches.
	 */
	get count() {
		return this.matches.length;
	}
	/**
	 * The percentage of matches where the player won.
	 * If the player has not played any matches, then the win rate is 0.
	 * @return {number} The percent of matches won by the player.
	 */
	get wlr() {
		if(this.count == 0) { return 0; } // avoid DIV/0
		return this.wins / this.count;
	}
	/**
	 * Creates a new instance of this data with the provided match added to the
	 * end of it.
	 * @return {PlayerStatistics} A new instance of PlayerStatistics.
	 */
	push(match) {
		var matches = this.matches.slice(); // copy the array of matches
		matches.push(match);
		return this.modifyData(data => {
			data[this.property] = new MatchData(this.pstats, this.property, matches);
		});
	}
}

/**
 * A point of data that contains just a single value.
 */
class NumberData extends PlayerData {
	constructor(pstats, property, value = 0) { super(pstats, property);
		/**
		 * The current numerical value of this data.
		 * @type {number}
		 */
		this.value = value;

		Object.freeze(this);
	}

	increase(n = 1) {
		return this.modifyData(data => {
			data[this.property] = new NumberData(this.pstats, this.property, this.value + n);
		});
	}
}

/**
 * A point of data that
 */
class CountData {
	constructor(pstats, game) {

	}
}

module.exports = PlayerStatistics;
