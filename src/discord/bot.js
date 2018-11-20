
var Discord = require("discord.js");
var logger  = new (require("../util/logger"))("discord");

const { shen } = require("../shen");
const strip = require("strip-ansi");

class DiscordBot {

	/**
	 * Configures a Discord bot.
	 *
	 * @param {Object} options Information about the bot.
	 * @param {string} options.token The Discord API token of the bot.
	 * @param {string} options.server The server ID to use as the main server.
	 */
	constructor(options)
	{
		/**
		 * The API token of this bot.
		 *
		 * @readonly
		 * @type {string}
		 */
		this.token = options.token;

		this.serverID = options.server;

		this.client = new Discord.Client();
		this.commandMap = new Map();
		this.connected = false;

		this.promptMap = new Map();

		this.chRegistration = "registration";
		this.chEvents = "events";
	}

	async connect(client = this.client)
	{
		if(this.connected) return;

		try
		{
			await this.client.login(this.token);
			this.connected = true;
		}
		catch (e)
		{
			logger.error(e);
			return;
		}

		logger.info("the discord bot is connected");

		this.client.on("warn", (info) => { logger.warn(info); });
		this.client.on("error", (error) => { logger.error(error); });

		let guild = this.client.guilds.get(this.serverID);
		let channels = guild.channels;

		let chRegistration = channels.find(channel => channel.name === "registration");
		if(!chRegistration) {
			logger.warn("could not find channel with name \"registration\"");
		}

		let chEvents = channels.find(channel => channel.name === "events");
		if(!chEvents) {
			logger.warn("could not find channel with name \"events\"");
		}

		//let msgRegistration = await chRegistration.send("Rate this post to register for Shen RS");
		//logger.info(`Created registration post of ID ${ msgRegistration.id }`);

		//msgRegistration.react("☑");

		//// adding reactions to the registration post

		//this.client.on("messageReactionAdd", async (msgreact, duser) =>
		//{
			//if(msgreact.message.id === msgRegistration.id)
			//{
				//if(duser.id === client.user.id) return; // ignore bot reactions

				//let user;
				//user = await shen().db.get_user_discord(duser.id);
				//if(!user)
				//{
					//let user = await shen().db.add_user(duser.username);
					//await shen().db.link_user_discord(duser.id, user.uuid);
					//logger.info(`User ${ duser.tag } registered.`);
				//}
				//else
				//{
					//logger.warn(`User already exists for ${ duser.tag }.`);
				//}
			//}
		//});

		// set avatar to whatever's in the folder atm
		await this.client.user.setAvatar("./avatar.png").catch((e) => logger.error(e));

		// command listening
		this.client.on("message", async (message) =>
		{
			let duser = message.author;
			let dchannel = message.channel;

			let sender = {
				discord:
				{
					user: duser,
					member: message.member,
					channel: dchannel
				},
				name: "discord",
				log:   (msg) => dchannel.send("```\n" + strip(msg) + "\n```"),
				info:  (msg) => logger.info(msg),
				warn:  (msg) => logger.warn(msg),
				error: (msg) => logger.error(msg),

				prompt: async (prompt) =>
				{
					dchannel.send(prompt);

					return new Promise((resolve) =>
					{
						// create function ahead in order to remove it later
						var fn = (dmessage) =>
						{
							if(duser.id === dmessage.author.id)
							{
								client.removeListener("message", fn);
								resolve(dmessage.content);
							}
						};

						client.on("message", fn);
					});
				},

				append: (msg) => process.stdout.write(msg)
			};

			await shen().cl.process(sender, message.content);
		});
	}
}

module.exports = DiscordBot;
