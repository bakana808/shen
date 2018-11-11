
module.exports.getRoundWins = (user, rounds) => {

	let wins = 0;
	for(let round of rounds) {
		if(user.equals(round.winner)) wins++;
	}
	return wins;
};

module.exports.getMatchPoint = (n) => {

	return Math.floor(n / 2) + 1;
};
