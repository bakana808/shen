
const Rankings = require("../rankings");
const chalk = require("chalk");
const { findOne } = require("../util/userutils");

module.exports.ladder_rank = async (sender, args) => {
	
	var rankings = await Rankings.calculate(null,
		// initialize stats
		(user) => {
			sender.info("initialized stats for " + user.tagc);
			return {
				match_count: 0,
				wins: 0,
				losses: 0,
				rating: 1500
			};
		},
		// process match
		(user, stats, match) => {
			
			sender.info(chalk.green(`match #${ match.id } > `) +
				"modified stats for " + user.tagc
			);
			stats.match_count++;

			if(user.equals(match.winner)) {
				stats.wins++;
			} else {
				stats.losses++;
			}

			return stats;
		}
	);

	sender.info("finished calculating rankings!");
	
	for (let entry of rankings.stat_map.entries()) {
		rankings.users.forEach(user => {
			if(user.uuid == entry[0]) {
				sender.info(user.tagc + ": " +
					"wins: " + entry[1].wins +
					" losses: " + entry[1].losses +
					" wr: " + ((entry[1].wins / entry[1].match_count) * 100).toFixed(2) + "%"
				);
				return false;
			}
		});
	}
};
