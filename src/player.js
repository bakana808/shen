
var User = require("./user");
var Options = require("./util/options");

/**
 * This class represents a player, which in this case means an
 * entrant or participant of a tournament.
 *
 * A Player is an extension of a User that includes additional information
 * that relates to the Tournament they are participating in.
 */
module.exports = class Player extends User {
	constructor(options) { super(options);
		// options verification
		options = Options.merge({
			tournament: null
		}, options);

		if(options.tournament == null) {
			throw new TypeError("Property \"tournament\" for Player cannot be null.");
		}

		/**
		 * The tournament that this player is in.
		 * @type {Tournament}
		 */
		Object.defineProperty(this, "tournament", { value: options.tournament });
	}

	/**
	 * Returns the most recent statistics of this player.
	 *
	 * @returns {type}  description
	 */
	get stats() {
		return this.tournament.standings.latest().getStats(this);
	}
};
