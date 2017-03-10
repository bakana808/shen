
class Logger {
	/**
	 * Logs a message to the console. If two arguments are used,
	 * the first argument will be used as the prefix.
	 */
	static log(lmsg, rmsg, level = "INFO") {
		if(rmsg == null) {
			console.log(`[${level}] ${lmsg}`);
		} else {
			console.log(`[${level}] ${rmsg}`);
		}
	}

	static info(lmsg, rmsg)  { Logger.log(lmsg, rmsg, "INFO"); }
	static warn(lmsg, rmsg)  { Logger.log(lmsg, rmsg, "WARN"); }
	static error(lmsg, rmsg) { Logger.log(lmsg, rmsg, "ERROR"); }
}

module.exports = Logger;
