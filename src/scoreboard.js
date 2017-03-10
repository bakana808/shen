
class Scoreboard {
	constructor(scoreMap, winners) {
		this._scoreMap = scoreMap;
		this._winners = winners;
	}

	static create(scoreMap, fn) {
		var winners = [];
		scoreMap.forEach((userid, score) => {
			if(fn(userid, score)) { winners.push(userid); }
		});
		return new Scoreboard(scoreMap, winners);
	}

	get winners() { return this._winners; }

	getScore(userid) {
		if(!this._scoreMap.has(userid)) {
			throw new ReferenceError("this player does not exist in this scoreboard.");
		} else {
			return this._scoreMap.get(userid);
		}
	}

	getWinner() { return this.winners[0]; }

	isWinner(userid) { return this.winners.includes(userid); }

	isTie() { return this.winners.length > 1; }

	hasWinners() { return this._winners.length > 0; }
}

module.exports = Scoreboard;
