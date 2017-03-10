
// external modules
var passport =        require("passport");
var DiscordStrategy = require("passport-discord").Strategy;

var express  =     require("express");
var app      =     express();
var cookieParser = require("cookie-parser");
var session =      require("express-session");

//var bodyParser = require("body-parser");
//var methodOverride = require("method-override");

// local modules
var shen =             require("./shen");
var FirebaseDatabase = require("./database/firebase");
var DiscordBot =       require("./discord/bot");
var DiscordCommands =  require("./discord/commands");
var User =             require("./user");
var ApiRouter =        require("./router/api");

//== config object -- holds environment variables ==/
var config = {
	firebase: {
		email: process.env.FIREBASE_CLIENT_EMAIL,
		key: process.env.FIREBASE_PRIVATE_KEY,
		id: process.env.FIREBASE_PROJECT_ID,
		databaseURL: process.env.FIREBASE_DATABASE_URL
	},
	discord: {
		id: process.env.DISCORD_CLIENT_ID,
		secret: process.env.DISCORD_CLIENT_SECRET,
		botToken: process.env.DISCORD_BOT_TOKEN
	}
};

//== set database to firebase ==//
shen.useDatabase(new FirebaseDatabase(config.firebase.email, config.firebase.id, config.firebase.databaseURL, config.firebase.key));

//== initalize discord bot ==//
var bot = new DiscordBot(config.discord.botToken);

Object.getOwnPropertyNames(DiscordCommands).forEach(key => {
	if(typeof DiscordCommands[key] == "function") {
		bot.registerCommand("." + key.toLowerCase(), DiscordCommands[key]);
	}
});

// bot.registerCommand("!debug",     DiscordCommands.debug);
// bot.registerCommand("!info",      DiscordCommands.tournamentInfo);
// bot.registerCommand("!stats",     DiscordCommands.playerStats);
// bot.registerCommand(".history",   DiscordCommands.playerHistory);
// bot.registerCommand(".standings", DiscordCommands.tournamentRankings);
// bot.registerCommand(".tourny",    DiscordCommands.tournament);
// bot.registerCommand(".current",   DiscordCommands.setCurrentTournament);
// bot.registerCommand(".adduser",   DiscordCommands.addUser);
// bot.registerCommand(".linkuser",  DiscordCommands.linkUser);
// bot.registerCommand(".g", DiscordCommands.game);
// bot.registerCommand(".killme", DiscordCommands.killme);

// == initialize express == //

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	shen.fetchUser(id).then((user) => {
		done(null, user);
	});
});

// configure discord passport strategy
passport.use(new DiscordStrategy({
	clientID: "237794547663372299",
	clientSecret: "dNay5zVEAl8ed9bhoUd1HQCo5NpzwbUv",
	callbackURL: "http://localhost:5000/auth/callback"
}, (_accessToken, _refreshToken, profile, done) => {
	process.nextTick(() => {
		console.log(profile);
		shen.writeUser(User.create(profile.id, profile.userid));
		return done(null, profile);
	});
}));

//app.engine("html", require("ejs").renderFile);
app.set("view engine", "ejs");
app.set("json replacer", null);
app.set("json spaces", 4);

// add sessions and passport to express
app.use(cookieParser());
app.use("assets", express.static(__dirname + "/../site")); // __dirname => shen-server/src
//app.use("/views", express.static(__dirname + "/views"));
app.use(session({ secret: "persist123" }));
app.use(passport.initialize());
app.use(passport.session());

// find the port to host this app (5000 by default)
var port = process.env.PORT === null ? process.env.PORT : 5000;

// route all API calls to the API router
app.use("/api", (new ApiRouter(express.Router())).router);

//== authentication routes ==//
app.get("/auth",
	passport.authenticate("discord", { scope: "identify" })
);
app.get("/auth/callback",
	passport.authenticate("discord", { failureRedirect: "/", successRedirect: "/profile" })
);

//== user profile route ==//
app.get("/profile", (req, res) => {
	var user = req.user;
	if(user == null) {
		res.redirect("/auth");
	} else {
		res.render("profile", user);
	}
});

// start the server
app.listen(port);
