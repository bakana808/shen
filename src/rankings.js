
/**
 * Handles match processing and player statistics.
 *
 *
 */
class Rankings {
	/**
	 * A function that is designed to handle a match.
	 *
	 * @typedef MatchHandlerFn
	 * @param {Match} The match.
	 */

	constructor(tournament) {
		this.fnHandleMatch = function(match, psm) {

		};
	}

	/**
	 * Sets the function used to read matches. The function should have the
	 * match to read as the only argument.
	 *
	 * This function is expected to read the match and modify the player
	 * statistics accordingly. Depending on the implementation used, this
	 * may include things like calculating ratings or adding to various
	 * statistics.
	 *
	 * @param  {MatchHandlerFn} fn The function that will be used to process matches.
	 */
	handleMatch(fn) {


	}
}
