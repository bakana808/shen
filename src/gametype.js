
/**
 * This class represents a game, and the type of stats
 * and rules that are supported for it.
 *
 * @class
 */
class Gametitle {

	/**
	 * Creates a new Gametitle.
	 *
	 * @param {Object} data              Information about the game.
	 * @param {string} data.title        The game's official title.
	 * @param {Object} data.restrictions This game's restrictions per round.
	 * @param {Object} data.meta         An object containing all the metainfo
	 *                                   that is supported.
	 */
	constructor(data) {

		/**
		 * The title of this game.
		 *
		 * @type {string}
		 */
		Object.defineProperty(this, "title", {

			value: data.title,
			enumerable: true
		});

		/**
		 * The round restrictions of this game.
		 *
		 * @type {Object}
		 */
		Object.defineProperty(this, "restrictions", {
			
			value: data.restrictions,
			enumerable: true
		});

		/**
		 * The availiable metainfo of this game.
		 *
		 * @type {Object}
		 */
		Object.defineProperty(this, "meta", {
			
			value: data.meta,
			enumerable: true
		});
	}
}

module.exports = Gametitle;
