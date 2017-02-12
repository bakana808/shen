var firebase = require("firebase");

var shen =        require("../shen");
var Logger =      require("../util/logger");
var User =        require("../user");
var Match =       require("../match");
var MatchSeries = require("../match/series");
var Round =       require("../round");
var Gametype =    require("../gametype");
var Tournament =  require("../tournament");

var { Keys, Errors } = require("./firebase/constants");

class FirebaseDatabase {
	constructor(email, projectId, databaseURL, privatekey) {
		//super("firebase");
		this.prefix = "firebase";
		firebase.initializeApp({
			serviceAccount: {
				projectId: projectId,
				clientEmail: email,
				privateKey: `-----BEGIN PRIVATE KEY-----\n${ privatekey.replace(/\\n/g, "\n") }\n-----END PRIVATE KEY-----\n`
			},
			databaseURL: databaseURL
		});
		this.fb = firebase.database();
	}

	model(obj) {
		if(obj == null) {
			throw new TypeError("Cannot create a database model from null");
		}

		//== User model ==//
		if(obj instanceof User) {
			return {
				nickname: obj.nickname
			};
		}

		//== Round model ==//
		if(obj instanceof Round) {
			return {
				winners: obj.winners
			};
		}

		//== Match model ==//
		if(obj instanceof Match) {

			var model = {
				tournament: obj.tournamentID,
				users:      obj.userIDs,
				winners:    obj.winners,
				label:      obj.label,
				time:       obj.time,
				type:       "unknown"
			};
			// match with multiple rounds
			if(obj instanceof MatchSeries) {
				model.type = "set";
				model.rounds = [];
				obj.rounds.forEach(round => {
					model.rounds.push(this.model(round));
				});
			}
		}

		throw new TypeError("Cannot create a database model from this object: " + obj);
	}

	// static _snapshotToRound(match, roundid, round_ss) {
	// 	if(!round_ss.exists()) {
	// 		throw new ReferenceError("cannot create round from empty snapshot.");
	// 	}
	//
	// 	// obtain winner of the round
	// 	// --------------------------
	// 	var winner_index = round_ss.child("winner").val();
	// 	var winner = match.userIDs[winner_index];
	//
	// 	return shen.Round(match.id, roundid, winner);
	// }

	// static _snapshotToMatch(id, snapshot) {
	// 	if(!snapshot.exists()) { return null; }
	//
	// 	// obtain userIDs in the match
	// 	// -----------------------------
	// 	var userIDs = snapshot.child("players").val();
	//
	// 	// obtain best-of value
	// 	// --------------------
	// 	var numRounds = snapshot.child("set").val();
	//
	// 	var time = snapshot.child("time").val();
	//
	// 	// obtain scores in the match
	// 	// --------------------------
	// 	// var scores = {};
	// 	// userIDs.forEach((userID) => {
	// 	// 	scores[userID] = 0;
	// 	// });
	//
	// 	// read rounds
	// 	// -----------
	// 	var rounds = [];
	//
	// 	var promise = Promise.resolve();
	//
	// 	for(var i = 0; i < numRounds; i++) {
	// 		var round_ss = snapshot.child(`games/${ i }/reports/0`);
	// 		if(round_ss.exists()) {
	// 			rounds.push(this._snapshotToRound(id, i, userIDs, round_ss));
	// 		}
	// 	}
	//
	// 	return new Promise((resolve) => {
	// 		return this.fetchUsers(userIDs)
	// 		.then((users) => {
	// 			return shen.Match(id, users, rounds, numRounds, time);
	// 		});
	// 	}); then(() => {
	// 		return this.fetchUsers(userIDs);
	// 	});
	// 	//var scoreboard = shen.scoreboard(userIDs, scores, numRounds);
	// }

	// static _snapshotToTournament(tournamentID, tournamentSs) {
	// 	if(!tournamentSs.exists()) { return null; }
	//
	// 	var gameID = tournamentSs.child("game").val();
	// 	var title = tournamentSs.child("title").val();
	//
	// 	this.fetchGametype(gameID)
	// 	.then((gametype) => {
	//
	// 	})
	// 	.catch(error => { throw error; });
	// 	var options = {
	// 		title: tournamentSs.child("title").val()
	// 	};
	//
	// 	return shen.Tournament(tournamentID, gameID, options);
	// }

	fetch(key) {
		return new Promise((resolve) => {
			this.fb.ref(key).once("value", (snapshot) => {
				Logger.log(this.prefix, `Read from key "${ key }".`);
				resolve(snapshot);
			});
		});
	}

	write(key, value, options = {}) {
		return new Promise((resolve, reject) => {
			var ref = this.fb.ref(key);
			ref.once("value", (snapshot) => {
				// reject the promise if the key exists
				if(snapshot.exists() && options.overwrite !== true) {
					// reject the promise
					reject(`Tried to write to key "${ key }", but it already exists.`);
				} else {
					// write the value into the database
					return ref.set(value).then(() => {
						Logger.log(this.prefix, `Wrote to key "${ key }".`);
						resolve();
					});
				}
			});
		});
	}

	//== User Methods ==//

	fetchUser(userIDs) {
		// do some type checking
		if(!(userIDs instanceof Array)) {

			if(userIDs == null) return [];  // return nothing
			userIDs = [userIDs]; // convert value to array with single element
		} else {

			if(userIDs.length == 0) return [];
		}
		return this.fetch(Keys.users).then((snapshot) => {

			let users = [];
			userIDs.forEach(userID => {

				var userSnapshot = snapshot.child(userID);
				if(userSnapshot.exists()) {
					// read information from the database
					var userObject = userSnapshot.val();
					users.push(shen.User(userID, userObject.nickname));
				} else {
					// warn and create dummy User
					Logger.warn(`User with ID ${ userID } does not exist in the database.`);
					users.push(shen.User(userID));
				}
				return users;
			});
		});
	}

	//== Tournament Methods ==//

	fetchTournamentExists(tournamentID) {
		return this.fetch(Keys.tournament(tournamentID)).then((snapshot) => {
			return snapshot.exists();
		});
	}

	fetchTournament(tournamentID) {
		var title;
		var gametype;
		var users;

		return this.fetch(Keys.tournament(tournamentID))
		.then((snapshot) => { // get tournament info
			if(!snapshot.exists()) { // throw error if not exists
				throw new ReferenceError(`A tournament with ID ${tournamentID} does not exist.`);
			}
			title =          snapshot.child("title").val();
			var gametypeId = snapshot.child("game").val();
			return this.fetchGametype(gametypeId);
		})
		.then((gametype_) => { // get gametype
			gametype = gametype_;
			return this.fetchTournamentUsers(tournamentID);
		})
		.then((users_) => { // get users in tournament
			users = users_;
			return this.fetchTournamentMatches(tournamentID, users);
		})
		.then((matches) => { // finally, get matches
			return shen.Tournament({
				id: tournamentID,
				time: 1452297600, // January 9, 2016 in UNIX. TODO: write this in the database
				title: title,
				users: users,
				game: gametype,
				matches: matches
			});
		});
	}

	/**
	 * Writes an object of properties into a tournament.
	 *
	 * @param  {type} tournamentID description
	 * @param  {type} obj          description
	 * @returns {type}              description
	 */
	writeTournamentProperties(tournamentID, obj) {
		var promise = Promise.resolve();
		Object.getOwnPropertyNames(obj).forEach(property => {
			let key = `rankings/tournaments/${ tournamentID }/${ property }`;
			promise.then(() => this.write(key, obj[property]));
		});
		return promise;
	}

	writeNewMatch(obj) {
		var key = "rankings/matches";
		return this.fetch(key).then(snapshot => {
			var id = 0;
			if(snapshot.exists()) {
				id = snapshot.numChildren(); // increment id
			}
			var promise = Promise.resolve();
			Object.getOwnPropertyNames(obj).forEach(property => {
				let key = "rankings/matches/" + id + "/" + property;
				promise.then(() => this.write(key, obj[property]));
			});
			return promise;
		});
	}

	/**
	 * Writes a tournament into the database from an id, a title, and a game id.
	 * Initializes the tournament with no players and no matches.
	 *
	 * @param  {type} tournamentID description
	 * @param  {type} title        description
	 * @param  {type} gameID       description
	 * @returns {type}              description
	 */
	writeTournament(tournamentID, gameID) {
		return this.writeTournamentProperties(tournamentID, {
			game: gameID,
			title: tournamentID
		});
	}

	/**
	 * Writes a user as a player in a tournament by their user ID. If that user
	 * is not actually a user, a warning will be given that a fake user will be used.
	 */
	writePlayer(tournamentID, userID) {
		var key = `rankings/players/${ tournamentID }/${ userID }`;
		return this.write(key, { rating: 0 });
	}

	writeMatch(tournamentID, userIDs, winners) {
		var time = Date.now();
		return this.writeNewMatch({
			tournament: tournamentID,
			time: time,
			users: userIDs,
			winners: winners
		});
	}

	/**
	 * Reads tournament matches from the database into an array of matches.
	 * The provided array of users will be used when reading matches.
	 *
	 * @param  {string} tournamentID The ID of the tournament.
	 * @param  {User[]} users        An array of users to use when reading matches.
	 * @returns {Match[]} An array of matches.
	 */
	fetchTournamentMatches(tournamentID, users) {
		return this.fetch(Keys.matches).then((snapshot) => {
			if(!snapshot.exists()) { // just silently return an empty array
				return [];
			}
			var matches = [];
			//var id = 0;
			snapshot.forEach(matchSnapshot => {
				var id =  matchSnapshot.key;
				var obj = matchSnapshot.val(); // the match object
				var matchUsers   = [];
				var matchRounds  = [];
				var matchWinners = []; // if no rounds are found, we'll use this array to get winners
				if(obj.tournament == null || obj.tournament == tournamentID) {
					// construct users
					// obj.players.forEach(userID => {
					// 	users.push(User.getUser(all_users, userID));
					// });
					obj.users.forEach(userID => {
						matchUsers.push(User.getUser(users, userID));
					});
					obj.winners.forEach(userID => {
						matchWinners.push(User.getUser(users, userID));
					});
					if("rounds" in obj) { // construct series
						// construct rounds
						obj.games.forEach((v) => {
							var roundWinner = User.getUser(users, obj.players[v.winner]);
							//Logger.info("round winner: " + roundWinner);
							matchRounds.push(shen.Round({
								users: matchUsers,
								// v.winner is the index of the array of users (??)
								winners: [roundWinner]
							}));
						});
						matches.push(shen.Match({
							id:         id,
							time:       Number(obj.time),
							users:      matchUsers,
							rounds:     matchRounds,
							numRounds:  Number(obj.set),
							tournament: tournamentID
						}));
					} else { // construct a match without rounds
						matches.push(shen.MatchSimple({
							id:         id,
							time:       Number(obj.time),
							users:      matchUsers,
							winners:    matchWinners,
							tournament: tournamentID
						}));
					}
				}
				//id++;
			});
			return matches;
		})
		.catch((error) => {
			Logger.error(error.stack);
		});
	}

	// /**
	//  * Fetches a range of matches from the tournamentID. By default,
	//  * the range is all the matches. Options can be given to narrow the range.
	//  */
	// fetchTournamentMatches(tournamentID, options = {}) {
	// 	return new Promise((resolve) => {
	// 		var matches = [];
	// 		var count = 0;
	// 		if(typeof options.count === "number") {
	// 			count = options.count;
	// 		}
	//
	// 		this.fb.ref(`rankings/matches/${ tournamentID }`).once("value", (snapshot) => {
	//
	// 			if(!snapshot.exists()) {
	// 				Logger.log(this.prefix, `Tried to read Matches for Tournament (id=${ tournamentID }), but couldn't find any.`);
	// 				resolve(null); return;
	// 			}
	//
	// 			var id = 0;
	// 			snapshot.forEach(function(matchSnapshot) {
	// 				var match = FirebaseDatabase._snapshotToMatch(id, matchSnapshot);
	// 				if(match !== null) { matches.push(match); }
	// 				id++;
	//
	// 				if(count > 0 && id >= count) return true;
	// 			});
	//
	// 			Logger.log(this.prefix, `Read ${ matches.length } Matches from Tournament (id=${ tournamentID }).`);
	//
	// 			resolve(matches);
	// 		});
	// 	});
	// }

	fetchTournamentUsers(tournamentID) {
		var key = `rankings/players/${ tournamentID }`;
		return this.fetch(key).then((snapshot) => {
			if(!snapshot.exists()) { // silently return empty array
				return [];
			}
			// collect user IDs in this tournament
			var userIDs = [];
			snapshot.forEach(child => { userIDs.push(child.key); });

			// return users
			return this.fetchUsers(userIDs);
		});
	}

	fetchTournamentPlayers(tournamentID) {
		return this.fetchTournamentExists(tournamentID)
		.then(exists => {
			if(!exists) throw new ReferenceError(Errors.noTournament(tournamentID));
			return this.fetch(Keys.tournamentPlayers(tournamentID));
		})
		.then(snapshot => {
			if(!snapshot.exists()) { // this shouldn't happen but if it does,
				return []; // return an empty array
			}
		});
	}

	fetchGametype(gameID) {
		var key = `games/${ gameID }`;
		return this.fetch(key).then((snapshot) => {

			if(!snapshot.exists())
				throw new ReferenceError(`The gametype with ID ${ gameID } does not exist.`);

			var gametypeObj = snapshot.val();
			var title = gametypeObj.title;
			return shen.Gametype(gameID, title);
		});
	}

	// fetchUser(id) {
	// 	//Logger.log(this.prefix, `Attempting to fetch User with id=${ id }.`);
	//
	// 	return new Promise((resolve, reject) => {
	// 		this.fb.ref(`users/${ id }`).once("value", (snapshot) => {
	//
	// 			if(snapshot.exists()) {
	// 				var val = snapshot.val();
	// 				Logger.log(this.prefix, `User (id=${ id }) was read from the database.`);
	// 				resolve(User.create(snapshot.key, val["nickname"]));
	// 			} else {
	// 				Logger.log(this.prefix, `Tried to read User (id=${ id }), which was not found.`);
	// 				reject("The user with this ID does not exist.");
	// 			}
	// 		});
	// 	});
	// }

	writeUser(user) {
		return new Promise((resolve, reject) => {
			// reference to a user model
			var ref = this.fb.ref(`users/${ user.id }`);
			ref.once("value", (snapshot) => {
				// check if this user already is in the database
				if(snapshot.exists()) {
					// reject the promise
					Logger.log(this.prefix, `Tried to write User (id=${ user.id }), but that user already exists. (use updateUser()?)`);
					reject("The user with this ID already exists.");
				} else {
					// this user doesn't exist, so write the user
					// into the database
					return ref.set({
						nickname: user.nickname
					}).then(() => {
						Logger.log(this.prefix, `Wrote User with (id=${ user.id }) into the database.`);
					});
				}
			});
		});
	}

	fetchUsers(userIDs) {
		return new Promise((resolve, reject) => {
			this.fb.ref("users").once("value", users_ss => {
				if(!users_ss.exists()) {
					reject("unable to fetch users");
				} else {
					var users = [];
					var ids = [];
					// push users if they exist in the database
					users_ss.forEach(user_ss => {
						ids.push(user_ss.key);
						if(userIDs.includes(user_ss.key)) {
							var userObj = user_ss.val();
							users.push(shen.User(user_ss.key, userObj.nickname));
						}
					});
					// second pass for users that don't exist in the database
					userIDs.forEach(userID => {
						if(!ids.includes(userID)) {
							users.push(shen.User(userID));
						}
					});
					resolve(users);
				}
			});
		});
	}
}

module.exports = FirebaseDatabase;
