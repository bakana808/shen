
const { table, getBorderCharacters } = require("table");

const Rankings = require("../rankings");
const chalk = require("chalk");
const { findOne } = require("../util/userutils");

const Elo = require("../elo");

module.exports.ladder_rank = async (sender, args) => {

	var elo = new Elo();

	/**
	 * Processes a match
	 */
	var matchFunction = function(user, stats, match, rankings) {

		stats.match_count++;

		let score = 0;

		if(user.equals(match.winners[0])) {
			stats.wins++;
			score = 1;
		} else {
			stats.losses++;
		}

		// get opponent stats

		let ouser = match.opponentOf(user);
		let ostats = rankings.getStats(ouser);

		// calculate adjustment

		let adjustment = Math.ceil(Elo.adjust(stats.rating, ostats.rating, score, 100));

		sender.info(chalk.green(`match #${ match.id } > `) +
			user.tagc + `: ${ stats.rating } <=> ${ ostats.rating } ` +
			"(" + (adjustment >= 0 ? chalk.green("+"+adjustment) : chalk.red(adjustment)) + ")"
		);

		stats.rating += adjustment;

		return stats;
	};

	var rankings = await Rankings.calculate({
		tournament: null,
		// initialize stats
		onStart: (user) => {
			sender.info("initialized stats for " + user.tagc);
			return {
				match_count: 0,
				wins: 0,
				losses: 0,
				rating: 1500
			};
		},
		// process match
		onMatch: matchFunction,
		onFinish: (_user, stats) => { return stats; },
		sort_fn: (a, b) => {

			let wr = (stats) => stats.match_count
				? ((stats.wins / stats.match_count) * 100).toFixed(2)
				: 0;
			
			let arating = a.rating, brating = b.rating;

			if(a.match_count < 3) arating = 0;
			if(b.match_count < 3) brating = 0;

			if(arating != brating) {
				return brating - arating; // sort by rating
			} else {
				return wr(b) - wr(a); // secondary: sort by winrate
			}
		}
	});

	sender.info("finished calculating rankings!");

	let data = [["", "user", "SR", "W", "L", "W%"]];

	let place = 1;
	for (let tuple of rankings) {
		let user = tuple[0], stats = tuple[1];

		// hide rating of players less than three matches
		let rating = stats.match_count < 3 ? "----" : stats.rating;

		data.push([
			place,
			user.name,
			rating,
			stats.wins,
			stats.losses,
			((stats.wins / stats.match_count) * 100).toFixed(2) + "%"
		]);
		place++;
	}

	let output = table(data, {
		border: getBorderCharacters("ramac"),
		drawHorizontalLine: (index, _size) => index === 1
	});

	sender.log(output);
};
