
/* index.js
 *
 * loads up everything we need for the program.
 */

// 1) Load Dependencies {{{

const CommandListener = require("./cmd/listener");

const util = require("util");

require("colors");

const os            = require("os");

const readline      = require("readline");
const logger        = require("./util/logger");

var passport        = require("passport");

const DiscordStrategy = require("passport-discord").Strategy;
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

var express         = require("express");
var cookieParser    = require("cookie-parser");
var session         = require("express-session");

var Shen             = require("./shen");
//var FirebaseDatabase = require("./database/firebase");
const SQLDatabase    = require("./database/sql");
var DiscordBot       = require("./discord/bot");
var DiscordCommands  = require("./discord/commands");
var User             = require("./user");
var ApiRouter        = require("./router/api");

// }}}
// 2) Load .env Variables {{{

// run dotenv to load variables from .env
require("dotenv").config();

//== config object -- holds environment variables ==/
var config = {
	firebase: {
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

// }}}
// 3) Connect to SQL Database {{{

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

// }}}
// 4) Configure Passport.js {{{

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	shen.db.get_user(id).then((user) => {
		done(null, user);
	});
});

// DISCORD STRATEGY ============================================================

passport.use(new DiscordStrategy(
	{
		clientID:     process.env.DISCORD_CLIENT_ID,
		clientSecret: process.env.DISCORD_CLIENT_SECRET,
		callbackURL: "/auth/discord/cb",
		proxy: true,
		passReqToCallback: true
	},
	(_req, _accessToken, _refreshToken, profile, done) => {
	
		// attempt to get a user with this discord ID
		shen.db.get_user_discord(profile.id)
			.then((user) => { done(null, user); })
			.catch((_e) => {

				return shen.db.add_user(profile.username)
					.then((user) => {
						return shen.db.link_user_discord(profile.id, user.id);
					})
					.then((user) => { done(null, user); })
					.catch((_e) => {
						logger.error(_e);
						done(null, false);
					});
			});
	})
);

passport.use(new GoogleStrategy(
	{
		clientID:     process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		callbackURL: "/auth/google/cb",
		proxy: true,
		passReqToCallback: true
	},
	(req, _accessToken, _refreshToken, profile, cb) => {
		
		if(req.user) { // link profiles

			if(profile._json.domain == "hawaii.edu") {
				logger.info("flagging user " + req.user.toString().green + " as verified (hawaii.edu)");
				shen.db.verifyUser(req.user.id)
					.then(() => cb(null, req.user));
			}
		
		} else { cb(null, false); }
	}
));

// }}}
// 5) Configure Express.js {{{

const app =  express();
const port = config.port;

//app.engine("html", require("ejs").renderFile);
app.set("view engine", "pug");
app.set("json replacer", null);
app.set("json spaces", 4);

// add sessions and passport to express
app.use(cookieParser());
app.use("assets", express.static(__dirname + "/../site")); // __dirname => shen-server/src
//app.use("/views", express.static(__dirname + "/views"));
app.use(session({ secret: "persist123" }));
app.use(passport.initialize());
app.use(passport.session());

// }}}
// 6) Define Routes {{{

// route all API calls to the API router
app.use("/api", (new ApiRouter(express.Router())).router);

// DISCORD AUTH ROUTES =========================================================

app.get("/auth/discord", passport.authenticate("discord", { scope: "identify" }));

app.get("/auth/discord/cb",
	passport.authenticate("discord", { failureRedirect: "/", successRedirect: "/profile" })
);

app.get("/auth/google", passport.authenticate("google", { hd: "hawaii.edu", scope: ["profile", "email"] }));

app.get("/auth/google/cb",
	passport.authenticate("google", { successRedirect: "/profile", failureRedirect: "/auth/google" })
);

// user-related routes
app.get("/profile", (req, res) => {
	var user = req.user;
	if(user == null) {
		res.redirect("/");
	} else {
		res.render("profile", { user: user.username });
	}
});

// }}}
// 7) Initialize CLI & Commands {{{

// command listener
var cl = new CommandListener();

// registering all commands
cl.registerObject(DiscordCommands, "discord commands");
cl.registerObject(require("./cmd/match_cmd"));
cl.registerObject(require("./cmd/rank_cmd"));

// sql test command
cl.register("sql-test", async (sender, _args) => {

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
	sender.info("sending query " + statement.green);

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

var server = app.listen(port);
logger.info(`listening on ${ server.address().address }:${ server.address().port }...`);

var shen = new Shen({
	db: db,
	cl: cl,
	server: server,
	bot: new DiscordBot(config.discord.botToken)
});

// =============================================================================
// Configuration is done - start CLI
// =============================================================================

shen.init().then(() => {

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
				rl.question("question ".gray + msg, (answer) => resolve(answer));
			});
		},
		append: (msg) => process.stdout.write(msg)
	};

	rl.prompt();
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

});
