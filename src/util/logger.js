
const chalk = require("chalk");

class Logger {
	/**
	 * Logs a message to the console. If two arguments are used,
	 * the first argument will be used as the prefix.
	 */
	static log(msg, level = 0, name = null) {
		
		var prefix = "";

		switch(level) {
		case 0: /* INFO */
			prefix = chalk.blue("info "); break;
		case 1: /* WARNING */
			prefix = chalk.yellow("warning "); break;
		case 2: /* ERROR */
			prefix = chalk.red("error "); break;
		default:
			prefix = "";
		}

		if(name != null) prefix = chalk.gray(name + " ") + prefix;

		if(level == 2 && msg instanceof Error) {
			console.log(prefix + msg.stack);
		} else {

			var lines = [];
			msg = ""+msg;

			if(msg.includes("\n")) {

				// split lines by newline if possible
				lines = msg.split("\n")
					.map(line => line.trim())    // trim all lines
					.filter(line => line != ""); // discard all empty lines

			}
			else {
				lines = [msg];
			}

			lines.forEach(line => console.log(`${prefix}${line.trim()}`));
		}
	}

	static info(msg, name = null)  { Logger.log(msg, 0, name); }
	static warn(msg, name = null)  { Logger.log(msg, 1, name); }
	static error(msg, name = null) { Logger.log(msg, 2, name); }

	constructor(name = "") {
		this.name = name;
	}

	info(line)  { Logger.log(line, 0, this.name); }
	warn(line)  { Logger.log(line, 1, this.name); }
	error(line) { Logger.log(line, 2, this.name); }
}

module.exports = Logger;
