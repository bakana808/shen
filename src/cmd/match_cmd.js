
const { shen } = require("../shen");
const chalk    = require("chalk");

const MatchBuilder = require("../matchbuilder");
const Round        = require("../round");
const { findOne }  = require("../util/userutils");

module.exports.add_match = async (sender, _args) => {

	var users = [];

	let mpre = "match > ".green;

	// MATCH - TOURNAMENT
	// ------------------
	var tslug = await sender.prompt(mpre + "tournament (n/a):");

	// MATCH - NUM ROUNDS
	// ------------------
	var num_rounds;
	for(;;) {
		num_rounds = await sender.prompt(mpre + "rounds (3): ");
		if(num_rounds == "") num_rounds = 3;

		if(!isNaN(num_rounds)) break;

		sender.error("rounds must be a number");
	}

	// MATCH - PLAYERS
	// ---------------
	var i = 0;
	var last_tag = "";
	for(;;) {
		last_tag = await sender.prompt(mpre + `player ${ i+1 } tag: `);

		if(last_tag == "") {
			if(users.length < 2) {
				sender.error("match requires at least 2 players");
			} else {
				break;
			}
		} else {
			try {
				var user = await shen().db.getUserByTag(last_tag);
				users.push(user);
				i++;
			} catch (e) {
				sender.error(e);
			}
		}
	}

	// START MATCH BUILDER
	// -------------------

	var mb = await MatchBuilder.open({
		tournament: null, // TODO add this feature later
		users: users,
		num_rounds: num_rounds
	});

	var m = null; // the match when it's complete

	// ROUND LOOP
	// ----------

	for(let i = 0; i < num_rounds; i++) {

		let rpre = mpre + `round ${i+1} > `.yellow;
		var meta = {};

		/*

		// STAGE USED
		// ----------
		meta.stage = await sender.prompt(rpre + "stage used (n/a): ");

		// PLAYER-SPECIFIC META
		meta.users = [];
		for(let j = 0; j < users.length; j++) {

			meta.users[j] = {};

			// CHARACTER USED
			// --------------
			meta.users[j].character = await sender.prompt(rpre + `character used by ${ users[j].tagc } (n/a): `);
		}

		*/

		// WINNER OF ROUND
		// ---------------

		/* @type User */ var winner;
		do {
			let tag = await sender.prompt(rpre + `winner (${users[0].tagc}): `);
			if(tag == "") { tag = users[0].tag; }

			winner = findOne(tag, users);
			if(winner == null) sender.error("this user does not exist in this match");
		}
		while(winner == null);

		// ADD ROUND TO MATCH BUILDER
		// --------------------------

		m = await mb.addRound({
			users: users,
			winners: [winner],
			meta: {}
		});

		if(m != null) {
			sender.info("match complete");
			break;
		}
	}
};

