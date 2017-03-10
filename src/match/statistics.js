
class MatchStatistics {
	constructor(userId, options = {}) {
		this.userId = userId;

		if(!(typeof options == "object")) {
			throw new TypeError("Options is not an object.");
		}

		if(!("rounds" in options)) options.rounds = [];
		this.rounds = options.rounds;

		if(!("points" in options)) options.points = 0;
		this.points = options.points;

		Object.freeze(this);
	}

	includeRound(round) {
		// check if this user is in this round
		if(!round.userIds.includes(this.userId)) {
			throw new ReferenceError(`The User (id=${ round.winner }) in a round that doesn't exist for this Match (id=${ this.id })`);
		}
	}
}
