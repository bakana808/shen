
/* index.js
 *
 * loads up everything we need for the program.
 */

//==============================================================================
// Dependencies
//==============================================================================

const util =  require("util");  // used to print objects

import chalk from "chalk";

const readline      = require("readline"); // used for CLI
const logger        = new (require("./util/logger"))("core");

// local dependencies

import { shen, init } from "./shen";

import SQLDatabase from "./database/sql";

const DiscordBot      = require("./discord/bot");
const DiscordCommands = require("./discord/commands");
const CommandListener = require("./cmd/listener");

//==============================================================================
// Configure Environment Variables
//==============================================================================

logger.info("starting server!");

// run dotenv to load variables from .env
require("dotenv").config();

//== config object -- holds environment variables ==/
const config = {
	firebase: { // no longer used
		email:       process.env.FIREBASE_CLIENT_EMAIL,
		key:         process.env.FIREBASE_PRIVATE_KEY,
		id:          process.env.FIREBASE_PROJECT_ID,
		databaseURL: process.env.FIREBASE_DATABASE_URL
	},
	discord: {
		id:       process.env.DISCORD_CLIENT_ID,
		secret:   process.env.DISCORD_CLIENT_SECRET,
		botToken: process.env.DISCORD_BOT_TOKEN
	},
	port: isNaN(process.env.PORT) ? 5000 : process.env.PORT
};

//==============================================================================
// Configure SQL Database
//==============================================================================

var db = new SQLDatabase();

/*
// set database to use with shen API
shen.useDatabase(new FirebaseDatabase(config.firebase.email, config.firebase.id, config.firebase.databaseURL, config.firebase.key));

// load active tournament
shen.fetchActiveTournament()
	.then(tournament => {
		DiscordCommands.static.tournament = tournament;
	})
	.catch(error => console.log(error.stack));
*/

//==============================================================================
// Configure Command Listener
//==============================================================================

logger.info("initializing command listener...");

// command listener
var cl = new CommandListener();

// registering all commands
cl.registerObject(DiscordCommands, "discord commands");
cl.registerObject(require("./cmd/discordManager"));
cl.registerObject(require("./cmd/match_cmd"));
cl.registerObject(require("./cmd/rank_cmd"));

// sql test command
cl.register("sql-test", async (sender, args) => {

	sender.info("testing SQL connection...");

	var time = Date.now();
	try {
		await db.test();
		sender.info(`responded in ${ Date.now() - time }ms`);
	}
	catch (e) { sender.error(e); }
}, true);

cl.register("sql-query", (sender, args) => {

	var statement = args.join(" ");
	sender.info("sending query " + chalk.green(statement));

	var time = Date.now();
	db.query(statement)
		.then((res) => {
			sender.info(`successful run in ${ Date.now() - time } ms`);

			let i = 1;
			res.rows.forEach((row) => {

				sender.info(`${i} | ${ util.inspect(row, false, null, true) }`);
				i++;
			});
		})
		.catch((error) => sender.error(error));
}, true);

cl.register("list-users", async (sender, args) => {

	sender.info("listing all users");

	var users = await db.getAllUsers();

	users.forEach(user => {
		sender.info(user.tagc);
	});

}, true);

// =============================================================================
// Discord Bot
// =============================================================================

logger.info("initializing discord bot...");

var bot = new DiscordBot({
	token: config.discord.botToken,
	server: process.env.DISCORD_SERVER_ID
});

// =============================================================================
// Configuration is done; Startup everything and begin CLI
// =============================================================================

init({
	database: db,
	commands: cl,
	bot: bot
}).then(() =>
{
	// add builtin gametitles
	shen().addGametitle("ssb4", require("./gametype/smash4"));

	logger.info("initializing command interface...");

	// readline interface
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		completer: (partial, callback) => {

			db.findUsers(partial).then((users) => {

				var tags = users.map(user => user.tag);
				callback(null, [tags, partial]);
			});
		}
	});

	var sender = {
		name: "cli",
		log:   (msg) => logger.log(msg, null),
		info:  (msg) => logger.info(msg),
		warn:  (msg) => logger.warn(msg),
		error: (msg) => logger.error(msg),
		prompt: (msg) => {
			return new Promise((resolve) => {
				rl.question(chalk.gray("question ") + msg, (answer) => resolve(answer));
			});
		},
		append: (msg) => process.stdout.write(msg)
	};

	rl.on("line", (line) => {

		//readline.moveCursor(process.stdout, 0, -1); // prevent input from being printed

		rl.pause();
		cl.process(sender, line, false)
			.catch((e) => logger.error(e))
			.finally(() => { rl.prompt(); });
	});

	rl.on("close", () => {
		db.close();
	});

	logger.info("startup complete!");
	logger.info(`server is listening on ${ server.address().address }:${ server.address().port }...`);

	rl.prompt();
});
