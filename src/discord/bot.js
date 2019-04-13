
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

	async getGuild(serverID) {

		return this.client.guilds.get(serverID);
	}

	async createChannel(channelName, categoryName = null) {

		var guild = await this.getGuild(this.serverID);
		var channels = guild.channels;
		var channel = null;
		
		if(categoryName == null) {

			// check channel name
			channel = channels.find((channel) => channel.name === channelName);
		}
		else {

			// check channel name and parent (category) name
			channel = channels.find((channel) => {
				
				let parent = channel.parent;
				return (parent && channel.name === channelName && channel.parent.name === categoryName)
			});
		}

		if(!channel) {

			channel = await guild.createChannel(channelName);

			if(categoryName != null) {

				var category = channels.find((channel) => {
					return (channel.type === "category" && channel.name === categoryName);
				});

				if(!category) {

					category = await guild.createChannel(categoryName, "category");
				}
				else {

					logger.warn("tried to create a category that already exists! (" + channelName + ")");
				}

				channel.setParent(category);
			}
		}
		else {

			logger.warn("tried to create a channel that already exists! (" + channelName + ")");
		}
	}

	async removeChannel(channelName, categoryName = null) {

		var guild = this.getGuild(this.serverID);
		var channels = guild.channels;

		if(categoryName == null) {

			// check channel name
			channel = channels.find((channel) => channel.name === channelName);
		}
		else {

			// check channel name and parent (category) name
			channel = channels.find((channel) => {
				
				let parent = channel.parent;
				return (parent && channel.name === channelName && channel.parent.name === categoryName)
			});
		}

		if(!channel) {
			
			channel.delete();
		}
	}

	/**
	 * Sets up a category and channels to use for an event.
	 *
	 */
	async createEventChannel(eventName) {

		logger.info("creating channels for event '" + eventName + "'...");

		var guild = this.client.guilds.get(this.serverID);
		var channels = guild.channels;
		var categoryName = "Event - " + eventName;

		let category = channels.find(channel => channel.name === categoryName);

		if(!category) {

			category = await guild.createChannel(categoryName, "category");
		}
		else {

			logger.warn("the respective category for this event already exists! reusing...");
		}

		const channel_chatName = "discussion";
		let channel_chat = channels.find(channel => {

			if(channel.name === channel_chatName && channel.parentID == category.id) {

				return true;
			}
			else {

				return false;
			}
		});

		if(!channel_chat) {

			channel_chat = await guild.createChannel(channel_chatName);
			channel_chat.setParent(category);
		}
		else {

			logger.warn("the respective discussion channel for this event already exists! reusing...");
		}
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

		if(this.serverID) {

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
		}
		else {

			logger.warn("ev 'DISCORD_SERVER_ID' is missing. channel listeners will not be made.");
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
