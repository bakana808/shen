
var outdent = require("outdent");

var shen =   require("../shen");
var Logger = require("../util/logger");

function formatMatch(userid, match, stats) {
	if(match.includesPlayer(userid)) {
		var msg = "\`\`\`md\n";
		msg += `${ match.id }. < ${ match.label } > `;
		match.userIds.forEach((v, k) => {
			if(k != 0) { msg += " vs. "; }
			if(match.isWinner(v)) {
				msg += `**${ v }** (${ stats.rating(v) })`;
			} else {
				msg += `${ v } (${ stats.rating(v) })`;
			}
		});
		msg += "\n  rounds: ";
		// match.userIds.forEach((value, j) => {
		// 	message += `\t${j}. ${ value }: ${ match.getRoundWins(value) }`;
		// 	if(match.isWinner(value)) { message += " ** winner **"; }
		// 	message += "\n";
		// });
		match.rounds.forEach(round => {
			msg += ` <${ round.winner }>`;
		});
		msg += "\`\`\`";
		return msg;
	}
	return null;
}

var Static = {};

class DiscordCommands {

	static debug(_author, _channel, args) {
		if(args.length > 0) {
			var root = args[0];

			if(root == "match" && args.length >= 2) {
				var cmd = args[1];

				// fill values of the keys of all matches,
				// if they're missing
				if(cmd == "fill" && args.length == 4) {
					var key = args[2];
					var value = args[3];

					shen.fetchMatches().then(matches => {
						matches.forEach(match => {
							if(match[key] == null) {
								match[key] = value;
								shen.db.write(match.dbKey, match.dbModel);
							}
						});
					})
					.catch(error => {
						Logger.error(error);
					});
				}
			}
		}
	}
	// prints player statistics
	static playerStats(_author, channel, args) {
		if(args.length == 2) {
			var tournamentId = args[0];
			var userid = args[1];
			var history = 0;
			if(args.length == 2) {
				history = Number(args[1]);
			}

			var tournament;

			shen.fetchTournament(tournamentId)
			.then(value => {
				tournament = value;
				return tournament.fetchStats();
			})
			.then(stats_history => {
				if(!stats_history.playerExists(userid)) {
					channel.sendMessage("that player does not exist.");
				} else {
					var stats;
					if(history == 0) {
						stats = stats_history.latest();
						channel.sendMessage(`player stats of **${ userid }** (latest)`);
					} else if (history < 0) { // relative to latest
						stats = stats_history.latest(history);
						channel.sendMessage(`player stats of **${ userid }** (${ -history } matches before latest)`);
					} else { // at specific match
						stats = stats_history.atMatch(history);
						channel.sendMessage(`player stats of **${ userid }** (at match ${ history })`);
					}

					var pstats = stats.getPlayerStats(userid);

					channel.sendMessage(outdent`
						\`\`\`
						total matches: ${ pstats._matchCount }
						wins: ${ pstats._wins } ( ${ Math.round(pstats._wins / pstats._matchCount * 100, 2) }% )
						rating: ${ pstats.rating }
						\`\`\`
					`);
				}
			})
			.catch(error => {
				Logger.log("error", error.stack);
			});
		}
	}

	// prints info on the current tournament
	static tournamentInfo(_author, channel, args) {
		if(args.length == 0) {
			channel.sendMessage(outdent`
				\`\`\`md
				!info <id> - Gets information about the tournament with this ID.
				\`\`\`
			`);
		}
		if(args.length == 1) {
			let tournamentId = args[0];
			shen.fetchTournament(tournamentId)
			.then(tournament => {
				var message = outdent`
					The current tournament is: **${ tournament.title }**
					\`\`\`yml
					id: "${ tournament.id }",
					game: "${ tournament.game.title }",
					matches: ${ tournament.matches.length },
					entrants: "${ tournament.users }"
					\`\`\`
				`;
				channel.sendMessage(message);
			})
			.catch(error => {
				channel.sendMessage("```" + error + "```");
				channel.sendMessage("```" + error.stack + "```");
			});
		}
	}

	static setCurrentTournament(_author, channel, args) {
		if(args.length == 0) {
			channel.sendMessage(outdent`
				\`\`\`md
				.current <t-id> - sets the current tournament for future commands
				\`\`\`
			`);
			if(Static.tournament == null) {
				channel.sendMessage("There's no current tournament set right now.");
			} else {
				channel.sendMessage("The current tournament is: " + Static.tournament.title);
			}
		}
		if(args.length >= 1) {
			let tournamentId = args[0];
			try {
				shen.fetchTournament(tournamentId)
				.then(tournament => {
					Static.tournament = tournament;
					channel.sendMessage("The current tournament is: " + Static.tournament.title);
				});
			} catch (error) {
				channel.sendMessage("We couldn't find a tournament with that ID. :disappointed_relieved:");
			}
		}
	}

	/**
	 * Game management commands
	 */
	static game(member, channel, args) {
		if(!member.permissions.hasPermission("ADMINISTRATOR")) {
			return; // lock out any user that is not a server admin
		}
		if(args.length == 0) {
			channel.sendMessage(outdent`
				\`\`\`md
				.g <id> edit stage <stage>
				\`\`\`
			`);
		}
	}

	/**
	 * Tournament management commands
	 *
	 * @param  {type} _author description
	 * @param  {type} channel description
	 * @param  {type} args    description
	 * @returns {type}         description
	 */
	static tournament(member, channel, args) {
		if(!member.permissions.hasPermission("ADMINISTRATOR")) {
			return; // lock out any user that is not a server admin
		}
		if(args.length == 0) { // help command
			channel.sendMessage(outdent`
				\`\`\`md
				!tournament - print this help message
				!tournament new <id> <game> - initializes a new tournament
				!tournament set <id> <property> <value> - sets a config property
				!tournament add <id> <user|match> <id> - adds a player or match by their id
				!t match <id> <user a> <user b> <winner> - adds a new match with basic information
				\`\`\`
			`);
		}
		if(args.length == 3 && args[0] == "new") { // new command
			let tournamentId = args[1];
			let gameId = args[2];
			shen.db.writeTournament(tournamentId, gameId)
			.then(() => {
				channel.sendMessage(`Successfully created new tournament. (\`id=${tournamentId}, game=${gameId}\`)`);
			})
			.catch(error => {
				channel.sendMessage("```" + error.stack + "```");
			});
		}
		if(args.length === 4 && args[0] == "add") { // add command
			if(args[2] == "user") {
				let tournamentId = args[1];
				let userId = args[3];
				shen.db.writePlayer(tournamentId, userId)
				.then(() => {
					channel.sendMessage(`Added player ${userId} to tournament. (\`id=${tournamentId}\`)`);
				})
				.catch(error => {
					channel.sendMessage("```" + error.stack + "```");
				});
			}
		}
		if(args.length == 4 && args[0] == "set") { // new command
			let tournamentId = args[1];
			let property =     args[2];
			let value =        args[3];
			let obj = {};
			obj[property] = value;
			shen.db.writeTournamentProperties(tournamentId, obj)
			.then(() => {
				channel.sendMessage(`Successfully set property ${property} (\`id=${tournamentId}\`)`);
			})
			.catch(error => {
				channel.sendMessage("```" + error.stack + "```");
			});
		}
		if(args.length == 5 && args[0] == "match") { // new match command
			let tournamentId = args[1];
			let userIds =      [args[2], args[3]];
			let winners =      [args[4]];
			shen.db.writeMatch(tournamentId, userIds, winners)
			.then(() => {
				channel.sendMessage(`Added new match ("${userIds[0]} vs ${userIds[1]}")`);
			})
			.catch(error => {
				channel.sendMessage("```" + error.stack + "```");
			});
		}
	}

	// prints player history for the current tournament
	static playerHistory(_author, channel, args) {
		var tournamentId = null, userId = null, promise = null;
		// 1 arg - use the current tournament
		if(args.length == 1 && Static.tournament != null) {
			userId = args[0];
			promise = Promise.resolve(Static.tournament);
		}
		// 2 args - use a user-defined tournament
		if(args.length >= 2) {
			tournamentId = args[1];
			userId = args[0];
			promise = shen.fetchTournament(tournamentId);
			//var tournament;
			//var stats_history;
		}
		// then the current promise if any
		if(promise != null) {
			promise.then(tournament => {
				var user = tournament.getUser(userId);
				var stats = tournament.standings.latest().getStats(user);

				channel.sendMessage(`printing match history for **${ user.nickname }**`);
				var message = "```diff\n";
				//var count = 0;
				stats.matches.forEach(match => {
					var label = match.getUserByOrder(0).nickname + " vs. " + match.getUserByOrder(1).nickname;
					if(match.isWinner(user)) {
						message += "+| Match " + match.id + " - " + label + "\n";
					} else {
						message += "-| Match " + match.id + " - " + label + "\n";
					}
				});
				message += "```";
				channel.sendMessage(message);
			})
			.catch(error => {
				Logger.log("error", error);
			});
		}

	}

	// prints the rankings for the current tournament
	static tournamentRankings(_author, channel, args) {
		var promise = null;
		if(args.length == 0) { // use the static tournament
			promise = Promise.resolve(Static.tournament);
		}
		if(args.length >= 1) { // find another tournament
			let tournamentId = args[0];
			promise = shen.fetchTournament(tournamentId);
		}
		if(promise != null) {
			promise.then(tournament => {
				var message = "";
				var last_division = "";
				var standings = tournament.standings.latest();
				channel.sendMessage("Current tournament standings for: **" + tournament.title + "**\n");
				standings.rankings.forEach(user => {
					var division = tournament.ranker.getDivision(standings.rating(user));

					if(division.name !== last_division) {
						if(last_division !== "") {
							message += "\`\`\`\n";
						}
						message += "*Division " + division.name + "*\n";
						message += "\`\`\`md\n";
						last_division = division.name;
					}

					message += "<" + standings.rating(user) + "> | ";
					message += user.nickname + "\n";
				});

				message += "\`\`\`";

				channel.sendMessage(message);
			})
			.catch(error => {
				Logger.log("error", error.stack);
			});
		}
	}
}

DiscordCommands.activeTournament = null;

module.exports = DiscordCommands;
