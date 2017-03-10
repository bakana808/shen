
//var Player = require("./player");
//var Match =  require("./match");

var Tournament = require("../tournament");
var Elo = require("../elo/elo");

module.exports = class Ladder extends Tournament {

	constructor(options) { super(options);

		var elo = new Elo({
			floor: 100,
			k: 50
		});

	}
};
