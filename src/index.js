
/* index.js
 *
 * loads up everything we need for the program.
 */

//==============================================================================
// Dependencies
//==============================================================================

const util =  require("util");  // used to print objects
const chalk = require("chalk"); // for printing colors

const readline      = require("readline"); // used for CLI
const logger        = new (require("./util/logger"))("core");

// passport.js + extras

const passport        = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const GoogleStrategy  = require("passport-google-oauth").OAuth2Strategy;

// express.js + extras

var express         = require("express");
var cookieParser    = require("cookie-parser");
var session         = require("express-session");

// local dependencies
const { shen, init }  = require("./shen");
const SQLDatabase     = require("./database/sql");
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
// Configure Passport.js
//==============================================================================

logger.info("initializing passport.js...");

// User Serialization ----------------------------------------------------------

passport.serializeUser((user, done) =>
{
	done(null, user.uuid); // convert user into uuid
});

passport.deserializeUser(async (uuid, done) =>
{
	let user = await shen().getUserByID(uuid); // convert uuid into user
	done(null, user);
});

// Strategies ------------------------------------------------------------------

passport.use(new DiscordStrategy(
	{
		clientID:     process.env.DISCORD_CLIENT_ID,
		clientSecret: process.env.DISCORD_CLIENT_SECRET,
		callbackURL: "/auth/discord/cb",
		proxy: true,
		passReqToCallback: true
	},
	async (_req, _accessToken, _refreshToken, profile, done) => {
	
		// attempt to get a user with this discord ID
		let user = await shen().getUserByLink({ discord: profile.id });

		if(user) // return user
		{
			logger.info(`discord user logged in ${ user.tag }`);
			done(null, user);
		}
		else // create a new user
		{
			logger.info(`creating new user for discord user ${ profile.tag }`);
			user = await shen().db.add_user(profile.username);
			user = await shen().db.link_user_discord(profile.id, user.id);

			done(null, user);
		}
	})
);

// Google authentication strategy

if(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {

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
					logger.info("flagging user " + chalk.green(req.user.toString()) + " as verified (hawaii.edu)");
					shen.db.verifyUser(req.user.id)
						.then(() => cb(null, req.user));
				}
			
			} else { cb(null, false); }
		}
	));
}
else {

	logger.warn("ev 'GOOGLE_CLIENT_ID' and 'GOOGLE_CLIENT_SECRET' not found! google auth will not be used.");
}

//==============================================================================
// Configure Express.js
//==============================================================================

logger.info("initializing express.js...");

const app =  express();
const port = config.port;

app.set("view engine", "pug");
app.set("json replacer", null);
app.set("json spaces", 4);

// add sessions and passport to express

const COOKIE_SECRET = "persist123"; // TODO move this to environment variable

app.use(cookieParser(COOKIE_SECRET));
app.use(session({
	store: new (require("connect-pg-simple")(session))(),
	secret: COOKIE_SECRET,
	resave: false,
	cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

//app.use("assets", express.static(__dirname + "/../site")); // __dirname => shen-server/src
//app.use("/views", express.static(__dirname + "/views"));
app.use(passport.initialize());
app.use(passport.session());

// use router/webapp.js as main router

app.use("/", require("./router/webapp"));

// Passport Authentication Routes ----------------------------------------------

logger.info("initializing authentication routes...");

app.get("/auth/discord",

	(req, res, next) => {
		
		logger.info("user is authenticating (callback = " + req.cookies["discord_cb_success"] + ")");
		next();
	},

	passport.authenticate("discord", { scope: "identify" })
);

app.get("/auth/discord/cb", (req, res, next) => {

	// get callback urls from cookies
	var successURL = req.cookies["discord_cb_success"];
	var failureURL = req.cookies["discord_cb_failure"];

	res.clearCookie("discord_cb_success");
	res.clearCookie("discord_cb_failure");

	passport.authenticate("discord", (err, user, info) => {

		if(info) { console.log("login info: " + JSON.stringify(info)); }
		
		if(err) {

			return res.redirect(failureURL);
		}
		else {

			console.log("user logged in! " + user.tag);
			req.logIn(user, (err) => {

				if(err) {

					return res.redirect(failureURL);
				}
				return res.redirect(successURL);
			});
		}

	})(req, res);
});

app.get("/auth/google",

	passport.authenticate("google", { hd: "hawaii.edu", scope: ["profile", "email"] })
);

app.get("/auth/google/cb", (req, res, next) => {

	// get callback urls from cookies
	var successURL = req.cookies["google_cb_success"];
	var failureURL = req.cookies["google_cb_failure"];

	res.clearCookie("google_cb_success");
	res.clearCookie("google_cb_failure");

	passport.authenticate("google", { successRedirect: successURL, failureRedirect: failureURL });
});

app.use(require("./router/api/v1")); // v1 API routes

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

// start listening now
var server = app.listen(port);

// =============================================================================
// Configuration is done; Startup everything and begin CLI
// =============================================================================

init({
	db: db,
	cl: cl,
	server: server,
	bot: new DiscordBot({
		token: config.discord.botToken,
		server: process.env.DISCORD_SERVER_ID
	})
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
