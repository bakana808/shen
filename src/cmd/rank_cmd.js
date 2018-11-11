
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

		stats.rating += adjustment;

		sender.info(chalk.green(`match #${ match.id } > `) +
			"modified stats for " + user.tagc +
			" (" + (adjustment >= 0 ? chalk.green("+"+adjustment) : chalk.red(adjustment)) + ")"
		);

		return stats;
	};

	var rankings = await Rankings.calculate({
		tournament: null,
		// initialize stats
		init_fn: (user) => {
			sender.info("initialized stats for " + user.tagc);
			return {
				match_count: 0,
				wins: 0,
				losses: 0,
				rating: 1500
			};
		},
		// process match
		match_fn: matchFunction,
		end_fn: (_user, stats) => { return stats; },
		sort_fn: (a, b) => {

			let wr = (stats) => stats.match_count
				? ((stats.wins / stats.match_count) * 100).toFixed(2)
				: 0;

			if(a.rating != b.rating) {
				return b.rating - a.rating; // sort by rating
			} else {
				return wr(b) - wr(a); // secondary: sort by winrate
			}
		}
	});

	sender.info("finished calculating rankings!");

	let data = [["user", "rating", "wins", "losses", "wr"]];

	for (let tuple of rankings) {
		let user = tuple[0], stats = tuple[1];

		data.push([
			user.tagc,
			stats.rating,
			stats.wins,
			stats.losses,
			((stats.wins / stats.match_count) * 100).toFixed(2) + "%"
		]);
	}

	let output = table(data, {
		border: getBorderCharacters("ramac"),
		drawHorizontalLine: (index, size) => index === 1
	});

	sender.info(output);
};
