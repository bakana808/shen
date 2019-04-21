
import express from "express";

import passport     from "passport";
import { Strategy as DiscordStrategy }     from "passport-discord";
import { OAuth2Stategy as GoogleStrategy } from "passport-google-oauth";

export function passportRouter(): Router {

	const router = express.Router();

	// Configure Passport user serialization
	// ---------------------------------------------------------------------

	passport.serializeUser((user, done): void =>
		{
			done(null, user.uuid); // convert user into uuid
		});

	passport.deserializeUser(async (uuid, done): Promise<void> =>
		{
			let user = await shen().getUserByID(uuid); // convert uuid into user
			done(null, user);
		});

	// Configure Passport strategies
	// ---------------------------------------------------------------------

	passport.use(new DiscordStrategy(
		{
			clientID:     process.env.DISCORD_CLIENT_ID,
			clientSecret: process.env.DISCORD_CLIENT_SECRET,
			callbackURL: "/auth/discord/cb",
			proxy: true,
			passReqToCallback: true
		},
		async (_req, _accessToken, _refreshToken, profile, done): Promise<void> => {

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

	router.get("/auth/discord",

		(req, res, next) => {

			logger.info("user is authenticating (callback = " + req.cookies["discord_cb_success"] + ")");
			next();
		},

		passport.authenticate("discord", { scope: "identify" })
	);

	router.get("/auth/discord/cb", (req, res, next) => {

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

	return router;
}
