
const chalk = require("chalk");

class Logger {

	/**
	 * Logs a message to the console. If two arguments are used,
	 * the first argument will be used as the prefix.
	 */
	static log(msg, level = 0, groupname = null) {
		
		var prefix = "";

		switch(level) {

		case 0: /* INFO */
			prefix = chalk.blue("info  "); break;
				
		case 1: /* WARNING */
			prefix = chalk.yellow("warn  "); break;

		case 2: /* ERROR */
			prefix = chalk.red("error "); break;

		default:
			prefix = "";
		}

		if(groupname != null) {

			prefix = prefix + chalk.gray(`(${ groupname }) `);
		}

		if(level == 2 && msg instanceof Error) {

			console.log(prefix + msg.stack);
		}
		else {

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

	static info(msg, groupname = null)  { Logger.log(msg, 0, groupname); }
	static warn(msg, groupname = null)  { Logger.log(msg, 1, groupname); }
	static error(msg, groupname = null) { Logger.log(msg, 2, groupname); }

	constructor(groupname = null) {
		this.groupname = groupname;
	}

	info(line)  { Logger.log(line, 0, this.groupname); }
	warn(line)  { Logger.log(line, 1, this.groupname); }
	error(line) { Logger.log(line, 2, this.groupname); }
}

module.exports = Logger;
