
class Ref {
	constructor(key) {
		Object.defineProperty(this, "key", { value: key });
	}
}

const Keys = exports.Keys = {
	// users
	users: "users",
	user: (userID) => `${Keys.users}/${userID}`,

	// tournaments
	tournaments: "rankings/tournaments",
	tournament: (tournamentID) => `${Keys.tournaments}/${tournamentID}`,
	tournamentGame:    (tournamentID) => `${Keys.tournament(tournamentID)}/game`,
	tournamentTitle:   (tournamentID) => `${Keys.tournament(tournamentID)}/title`,
	tournamentPlayers: (tournamentID) => `${Keys.tournament(tournamentID)}/players`,
	//tournamentPlayers: (tournamentID) => `rankings/players/${tournamentID}`,
	tournamentPlayer: (tournamentID, userID) => `${Keys.tournamentPlayers(tournamentID)}/${userID}`,

	// matches
	matches: "rankings/matches",
	match: (matchID) => `${Keys.matches}/${matchID}`,
	matchTime:       (matchID) => `${Keys.match(matchID)}/time`,
	matchPlayers:    (matchID) => `${Keys.match(matchID)}/players`,
	matchWinners:    (matchID) => `${Keys.match(matchID)}/winners`,
	matchTournament: (matchID) => `${Keys.match(matchID)}/tournament`,
	matchRound:      (matchID, i) => `${Keys.match(matchID)}/rounds/${i}`,
	matchRoundTotal: (matchID) =>    `${Keys.match(matchID)}/roundTotal`
};

const Errors = exports.Errors = {
	// null reference
	noTournament: (tournamentID) => `The tournament with ID ${tournamentID} does not exist`,
	noGame: (gameID) => `The game with ID ${gameID} does not exist`
};
