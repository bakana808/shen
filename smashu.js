
const Gametitle = require("../gametype");

/**
 * Implementation of the Super Smash Bros. Ultimate
 * (current) tournament ruleset.
 *
 * note: not completely implemented yet
 */

const stages = {
	"fd": "Final Destination",
	"bf": "Battlefield",
	"dl64": "Dreamland 64",
	"sv": "Smashville",
	"tc": "Town and City",
};

const chars = {
	"mario": "Mario",
	"luigi": "Luigi",
	"peach": "Peach",
	"bowser": "Bowser",
	"drmario": "Dr. Mario",
	"yoshi": "Yoshi",
	"dk": "Donkey Kong",
	"diddy": "Diddy Kong",
	"link": "Link",
	"zelda": "Zelda",
	"sheik": "Sheik",
	"ganon": "Ganondorf",
	"tlink": "Toon Link",
	"samus": "Samus",
	"zss": "Zero Suit Samus",
	"kirby": "Kirby",
	"mk": "Meta Knight",
	"dedede": "King Dedede",
	"fox": "Fox",
	"falco": "Falco",
	"pikachu": "Pikachu",
	"jiggs": "Jigglypuff",
	"mewtwo": "Mewtwo",
	"charizard": "Charizard",
	"lucario": "Lucario",
	"falcon": "Captain Falcon",
	"ness": "Ness",
	"lucas": "Lucas",
	"marth": "Marth",
	"roy": "Roy",
	"ike": "Ike",
	"gaw": "Mr. Game & Watch",
	"pit": "Pit",
	"wario": "Wario",
	"olimar": "Olimar",
	"rob": "R. O. B.",
	"sonic": "Sonic",

	"rosalina": "Rosalina & Luma",
	"bowserjr": "Bowser Jr.",
	"greninja": "Greninja",
	"robin": "Robin",
	"lucina": "Lucina",
	"corrin": "Corrin",
	"palutena": "Palutena",
	"darkpit": "Dark Pit",
	"villager": "Villager",
	"littlemac": "Little Mac",
	"wiifit": "Wii Fit Trainer",
	"shulk": "Shulk",
	"duckhunt": "Duck Hunt",
	"megaman": "Mega Man",
	"pacman": "Pac-Man",
	"ryu": "Ryu",
	"cloud": "Cloud",
	"bayo": "Bayonetta",
	"miib": "Mii Brawler",
	"miis": "Mii Swordfighter",
	"miig": "Mii Gunner"
};

const restrictions = {
	"teams": [2],
	"teamsize": [1, 2]
};

module.exports = new Gametitle({
	"title":        "Super Smash Bros. Ultimate",
	"restrictions": restrictions,
	"meta": {
		"characters": {
			// specific to each round and player
			scopes: ["round", "player"],
			values: chars
		},
		"stages": {
			// specific to each round
			scopes: ["round"],
			values: stages
		}
	}
});
