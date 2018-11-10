
const logger = require("../util/logger");

const logname = "cmd";

/**
 * 
 */
class CommandListener {

	constructor(prefix = ".") {

		/**
		 * A map of registered commands. Commands are represented as Objects,
		 * where obj.fn is the function and
		 * obj.cli is whether the command is CLI-only or not.
		 *
		 * @member {Map<Object>}
		 */
		this.commands = new Map();

		/**
		 * The prefix to use for commands. This prefix does not apply to the CLI.
		 *
		 * @member {string}
		 */
		this.prefix = prefix;
		
		logger.info(`using prefix "${prefix}"`, logname);
	}

	/**
	 * Registers a command.
	 *
	 * @param root {string} the root name of the command
	 * @param fn {function} the function to run
	 * @param cli {boolean} if true, restricts this command to the CLI only
	 */
	register(root, fn, cli = false, log = true) {

		root = root.toLowerCase();
		this.commands.set(root, {
			fn: fn,
			cli: cli
		});

		if(log) {

			if(cli) {
				logger.info(`added ${ root.green } (CLI)`, logname);
			} else {
				logger.info(`added ${ root.green }`, logname);
			}
		}
	}

	/**
	 * Registers commands from an object.
	 * For each function found in the object, its key will be used as the root command.
	 */
	registerObject(obj, groupname = null) {

		if(groupname == null) { groupname = obj.constructor.name; }

		var roots = [];
		Object.getOwnPropertyNames(obj).forEach(key => {

			if(typeof obj[key] == "function") {

				let fn = obj[key];
				let root = key;

				this.register(root, fn, false, false);
				roots.push(root.green);
			}
		});

		logger.info(`added ${ roots.join(", ") }`, logname);
	}

	/**
	 * A callback to log a message at the INFO level.
	 *
	 * @callback logInfo
	 * @memberof CommandListener
	 * @param {string} message
	 */

	/**
	 * A callback to log a message at the WARN level.
	 *
	 * @callback logWarn
	 * @memberof CommandListener
	 * @param {string} message
	 */

	/**
	 * A callback to log a message at the ERROR level.
	 *
	 * @callback logError
	 * @memberof CommandListener
	 * @param {string} message
	 */

	/**
	 * Parses a message to find if a command should be run.
	 * This function will not run CLI commands.
	 *
	 * @param {string}   sender.name  the name of the sender
	 * @param {logInfo}  sender.log   a function to log a message at the INFO level
	 * @param {logWarn}  sender.warn  a function to log a message at the WARN level
	 * @param {logError} sender.error a function to log a message at the ERROR level
	 *
	 * @param message {string} the message to process
	 *
	 * @returns Promise[boolean] whether a command was found or not
	 */
	async process(sender, message, use_prefix = true) {
		var args = message.split(" ");

		if(args.length > 0) {

			var root = args[0]; // set root to first argument
			args.splice(0, 1); // remove first argument

			if(use_prefix) {

				// strips the prefix from the root before searching
				if(!root.startsWith(this.prefix)) { return false; }
				else {

					root = root.slice(this.prefix.length);
				}
			}

			// search for command
			if(this.commands.has(root)) {

				try {
					let cmd = this.commands.get(root);

					if(cmd.cli == true && sender.name.toLowerCase() != "cli") { return false; }

					if(sender.name.toLowerCase() != "cli") { logger.info(`running cmd ${ root.green }...`); }

					await cmd.fn(sender, args);

				} catch(error) {

					sender.error(error.stack);
				}
			} else {
				throw new Error("unknown command: " + root);
			}
		}
	}

	processCLI(message) {

		var sender = {
			name: "cli",
			info:  (msg) => logger.info(msg),
			warn:  (msg) => logger.warn(msg),
			error: (msg) => logger.error(msg)
		}

		return this.process(sender, message);
	}
}

module.exports = CommandListener;
