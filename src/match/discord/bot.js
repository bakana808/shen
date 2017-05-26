
var Discord = require("discord.js");
var Logger  = require("../util/logger");

module.exports = class DiscordBot {
	constructor(token) {
		this.commandMap = new Map();
		this.prefix = "discord";
		this.online = false;
		this.bot = new Discord.Client();
		this.bot.login(token);

		this.bot.on("ready", () => {
			Logger.log("discord", "The discord bot went online.");

			// save the rankings text channel into a variable
			// TODO: don't hardcode the server id
			this.channel = this.bot.guilds.get("174405074087313408")
			.channels.find("name", "dev");
			this.online = true;
		});

		this.bot.on("message", (message) => {
			//== command parsing ==//
			var args = message.content.split(" ");
			if(args.length > 0) {
				var root = args[0]; // set root to first argument
				args.splice(0, 1); // remove first argument

				if(this.commandMap.has(root)) {
					try {
						this.commandMap.get(root)(message.member, message.channel, args);
					} catch(error) {
						message.channel.sendMessage("```" + error.stack + "```");
					}
				}
			}
		});
	}

	registerCommand(root, callback) {
		this.commandMap.set(root, callback);
		Logger.log("discord", `command registered: ${ root }`);
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
};
