
import { Server }   from "http";

import passport     from "passport";
import express      from "express";
import cookieParser from "cookie-parser";
import session      from "express-session";

import Logger from "../util/logger";

import { passportRouter } from "./routers/auth";

const log = new Logger("server");

/**
 * Handles all API and authentication routes
 */
export default class ShenServer {

	public server: Server;

	constructor(server: Server) {

		this.server = server;
	}

	static async start(): Promise<ShenServer> {

		let port = 5000;

		try { port = parseInt(process.env.PORT); } catch {}

		// Configure Express
		// ---------------------------------------------------------------------

		log.info("initializing express.js...");

		const app: express.Application = express();

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

		app.use(passport.initialize());
		app.use(passport.session());

		// authentication routes
		log.info("adding authentication routes...");
		app.use(passportRouter());

		// API routes
		log.info("adding api routes...");
		app.use(require("./router/api/v1")); // v1 API routes

		let server = app.listen(port);

		log.info("server is running!");

		return new ShenServer(server);
	}

}
