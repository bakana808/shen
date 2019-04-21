
/**
 * Keeps track of user scores in a contest.
 *
 */
class Scoreboard {
	
	/**
	 * Creates a new scoreboard.
	 *
	 * @param {Collection<User>} users
	 */
	constructor(users) {

		if(!Array.isArray(users)) {

			throw new Error("an array of users must be provided to create a scoreboard");
		}

		Object.defineProperty(this, "users", { value: users });

		this.scores = new Map();

		users.forEach(user => {

			this.scores.set(user.id, 0);
		});
	}

	setScore(user, score) {

		if(!this.scores.has(user.id)) {

			throw new Error("cannot set score of user not on this scoreboard");
		}

		if(isNaN(score) || score < 0 || score > 1) {

			throw new Error("score out of range; must be between 0 and 1");
		}

		this.scores.set(user.id, score);
	}

	setWinner(user, score) {

		this.scores.forEach((score, id) => {

			if(id == user.id) {

				this.scores.set(id, 1);
			}
			else {
				
				this.scores.set(id, 0);
			}
		});
	}

	getScore(user) {

		if(!this.scores.has(user.id)) {

			throw new Error("cannot get score of user not on this scoreboard");
		}

		return this.scores.get(user.id);
	}

	getScoreArray() {

		return this.scores.values();
	}

	/**
	 * Returns the user with the highest score.
	 *
	 * @returns {User} The user with the highest score
	 */
	getWinner() {

		var user = null;
		var score = 0;

		this.scores.forEach((v, k) => {

			if(v > score) {

				user = this.users.get(k);
				score = v;
			}
		});

		if(score == 0) {

			throw new Error("cannot get highest; all scores are 0");
		}
	}

	/**
	 * Returns true if there is at least one winner.
	 *
	 * @returns {boolean}
	 */
	isResolved() {

		try {
			
			this.getWinner();
			return true;
		}
		catch (e) {

			return false;
		}
	}
}

module.exports = Scoreboard;
