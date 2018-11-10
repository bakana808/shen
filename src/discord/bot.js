
var Discord = require("discord.js");
var logger  = new (require("../util/logger"))("discord");

module.exports = class DiscordBot {

	constructor(token) {

		/**
		 * The API token of this bot.
		 *
		 * @readonly
		 * @type {string}
		 */
		this.token = token;

		this.commandMap = new Map();
		this.connected = false;
		this.bot = new Discord.Client();
		this.bot.login(token);

		this.promptMap = new Map();
	}

	async init() {

		if(this.connected) return;

		this.bot.on("warn", (info) => { logger.warn(info); });
		this.bot.on("error", (error) => { logger.error(error); });


		return new Promise((resolve) => {
			this.bot.once("ready", () => {

				// save the rankings text channel into a variable
				// TODO: don't hardcode the server id
				this.channel = this.bot
					.guilds.get("174405074087313408")
					.channels.find(channel => channel.name === "dev");

				// set avatar to whatever's in the folder atm
				this.bot.user.setAvatar("./avatar.png")
					.catch((e) => logger.error(e));

				this.bot.on("message", (message) => {
					//== command parsing ==//
					var args = message.content.split(" ");
					if(args.length > 0) {
						var root = args[0]; // set root to first argument
						args.splice(0, 1); // remove first argument

						if(this.commandMap.has(root)) {
							try {
								this.commandMap.get(root)(message.member, message.channel, args, this);
							} catch(error) {
								message.channel.sendMessage("```" + error.stack + "```");
							}
						}
					}
				});
				
				this.connected = true;
				logger.info("the discord bot is connected");
				resolve();
			});

			this.bot.login(this.token);
		})
			.catch((e) => {
				logger.error(e);
			});
	}

	registerCommand(root, callback) {
		this.commandMap.set(root, callback);
		logger.info(`command registered: ${ root }`);
	}

	// onCommand(prefixes, callback) {
	// 	this.bot.on("message", (message) => {
	// 		var msg = message.content;
	// 		if(msg.charAt(0) in prefixes) {
	// 			Logger.log("discord", `user ${ message.author.userid } has run command: ${ msg.slice(1) }`);
	// 			callback(message.author, message.channel, msg.slice(1).split(" "));
	// 		}
	// 	});
	// }

	chat(channel, message) {
		this.channel.sendMessage(message, {split: true});
	}

	chatCode(channel, lang, message) {
		this.channel.sendCode(lang, message, {split: true});
	}

	/**
	 * Asks a user to type "yes" or "no" (or any shortcuts) and executes a callback.
	 *
	 * @return {Promise<boolean>} the user's response
	 */
	promptUserYN(member, channel, prompt) {
		channel.sendMessage(prompt);

		return new Promise((resolve, reject) => {
			// create function ahead in order to remove it later
			var fn = (message) => {
				var msg = message.content;
				var _member = message.member;

				if(member == _member) {
					this.bot.removeListener("message", fn);

					if(msg.toLowerCase() == "yes") {
						resolve(true);
						return;
					}
					if(msg.toLowerCase() == "no") {
						resolve(false);
						return;
					}

					reject("The user gave incorrect input.");
				}
			};
			this.bot.on("message", fn);
		});
	}

	/**
	 * Asks a user to type a string and executes a callback.
	 *
	 * @return {Promise<string>} the user's response
	 */
	promptUser(member, channel, prompt) {
		channel.sendMessage(prompt);

		return new Promise((resolve) => {
			// create function ahead in order to remove it later
			var fn = (message) => {
				var msg = message.content;
				var _member = message.member;

				if(member == _member) {
					this.bot.removeListener("message", fn);
					resolve(msg);
				}
			};
			this.bot.on("message", fn);
		});
	}
};
