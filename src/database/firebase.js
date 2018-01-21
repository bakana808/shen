var firebase = require("firebase-admin");

var shen =        require("../shen");
var Logger =      require("../util/logger");
var User =        require("../user");
var Match =       require("../match");
var MatchSeries = require("../match/series");
var Round =       require("../round");
var Game =        require("../gametype");

var { Keys, Errors } = require("./firebase/constants");

var serviceAccount = require("../../firebase_service_key.json");

class FirebaseDatabase {
	constructor(_email, _projectId, databaseURL, _privatekey) {
		//super("firebase");
		this.prefix = "firebase";
		firebase.initializeApp({
			// credential: firebase.credential.cert({
			// 	projectId: projectId,
			// 	clientEmail: email,
			// 	privateKey: `-----BEGIN PRIVATE KEY-----\n${ privatekey.replace(/\\n/g, "\n") }\n-----END PRIVATE KEY-----\n`
			// }),
			credential: firebase.credential.cert(serviceAccount),
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

	fetch(key) {
		return new Promise((resolve) => {
			this.fb.ref(key).once("value", (snapshot) => {
				Logger.log(this.prefix, `Read from key "${ key }".`);
				resolve(snapshot);
			}, (error) => {
				console.log(error.stack);
			});
		});
	}

	write(key, value, overwrite = false) {
		return new Promise((resolve, reject) => {
			var ref = this.fb.ref(key);
			ref.once("value", (snapshot) => {
				// reject the promise if the key exists
				if(snapshot.exists() && overwrite !== true) {
					// reject the promise
					reject(`Tried to write to key "${ key }", but it already exists.`);
				} else {
					if(typeof value == "object" && !(value instanceof Array)) {
						ref.update(value).then(() => {
							Logger.log(this.prefix, `Updated values at key "${ key }".`);
							resolve();
						});
					} else {
						ref.set(value).then(() => {
							Logger.log(this.prefix, `Wrote value at key "${ key }".`);
							resolve();
						});
					}
				}
			});
		});
	}

	//region// General Functions ///////////////////////////////////////////////

	/**
	 * Initializes a user by a user ID and an object representing the user.
	 * If the object is null or is missing any of the required keys, then it will
	 * construct a "dummy" user.
	 *
	 * @param  {type} userID         The ID of the user.
	 * @param  {type} userObj = null The object representing the user.
	 * @return {User} A user.
	 */
	constructUser(userID, userObj = null) {
		if(userObj != null && userObj.nickname != null) {
			return shen.User(userID, userObj.nickname);
		}
		return shen.User(userID);
	}

	fetchUser(userIDs) {
		// do some type checking
		if(!(userIDs instanceof Array)) { // create single user
			let userID = userIDs;
			if(userID == null) return Promise.resolve(null);  // return nothing
			//userIDs = [userIDs]; // convert value to array with single element
			return this.fetch(Keys.user(userID)).then(snapshot => {
				if(!snapshot.exists()) {
					throw new ReferenceError("The user with this ID does not exist.");
				}
				let userObject = snapshot.val();
				return shen.User(userID, userObject.nickname);
			});
		} else { // create array of users
			if(userIDs.length == 0) return Promise.resolve([]);
			return this.fetch(Keys.users).then((snapshot) => {
				let users = [];
				userIDs.forEach(userID => {
					var userSnapshot = snapshot.child(userID);
					if(userSnapshot.exists()) {
						users.push(this.constructUser(userID, userSnapshot.val()));
					} else {
						// warn and create dummy User
						Logger.warn(`User with ID ${ userID } does not exist in the database.`);
						users.push(this.constructUser(userID, null));
					}
				});
				return users;
			});
		}
	}

	/**
	 * Adds a user to the database.
	 * The promise will reject if the user with that ID already exists.
	 *
	 * @param  {User} user The User object to add.
	 * @returns {undefined}
	 */
	addUser(user) {
		return this.write(Keys.user(user.id), {
			nickname: user.nickname
		});
		// return new Promise((_resolve, reject) => {
		// 	// reference to a user model
		// 	var ref = this.fb.ref(`users/${ user.id }`);
		// 	ref.once("value", (snapshot) => {
		// 		// check if this user already is in the database
		// 		if(snapshot.exists()) {
		// 			// reject the promise
		// 			Logger.log(this.prefix, `Tried to write User (id=${ user.id }), but that user already exists. (use updateUser()?)`);
		// 			reject("The user with this ID already exists.");
		// 		} else {
		// 			// this user doesn't exist, so write the user
		// 			// into the database
		// 			return ref.set({
		// 				nickname: user.nickname
		// 			}).then(() => {
		// 				Logger.log(this.prefix, `Wrote User with (id=${ user.id }) into the database.`);
		// 			});
		// 		}
		// 	});
		// });
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

	discordLinkUser(userID, username) {
		return this.write(Keys.user(userID) + "/discord", username, true);
	}

	//endregion//

	//region// Tournament Database Functions ///////////////////////////////////

	/**
	 * Writes a tournament into the database from an id and a game id.
	 * This will initialize the tournament with no players and no matches.
	 *
	 * @param  {type} tournamentID description
	 * @param  {type} title        description
	 * @param  {type} gameID       description
	 * @returns {type}              description
	 */
	addTournament(tournamentID, gameID) {
		return this.write(Keys.tournament(tournamentID), {
			game: gameID,
			title: tournamentID
		});
	}

	/**
	 * Reads the ID of the "active" tournament.
	 *
	 * @return {Promise<string>} A promise to the tournament ID.
	 */
	fetchActiveTournamentID() {
		return this.fetch(Keys.activeTournament)
			.then(snapshot => {
				if(!snapshot.exists()) {
					throw new ReferenceError("The Active Tournament does not exist.");
				} else {
					return snapshot.val();
				}
			});
	}

	/**
	 * Writes the ID of the "active" tournament.
	 *
	 * @return {Promise} A promise that resolves to nothing.
	 */
	writeActiveTournamentID(tournamentID) {
		return this.write(Keys.activeTournament, tournamentID);
	}

	/**
	 * Reads a tournament from an ID and constructs a tournament from other functions.
	 * The order of what this function will read from the database is:
	 *   1. Tournament information.
	 *   2. The game the tournament is using.
	 *   3. The players that are in the tournament.
	 *   4. The matches that are related to this tournament.
	 *
	 * @param  {type} tournamentID description
	 * @returns {type}              description
	 */
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
				return this.fetchTournamentPlayers(tournamentID);
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
	 * Attempts to find a tournament with this ID. If successful, then returns true,
	 * and false if not.
	 *
	 * @param  {type} tournamentID description
	 * @returns {type}              description
	 */
	fetchTournamentExists(tournamentID) {
		return this.fetch(Keys.tournament(tournamentID)).then((snapshot) => {
			return snapshot.exists();
		});
	}

	setTournamentGame(tournamentID, game) {
		if(!(game instanceof Game))
			throw new TypeError("Cannot set tournament game to a non-game.");

		return this.write(Keys.tournamentGame(tournamentID), game.id);
	}

	setTournamentTitle(tournamentID, title) {
		if(typeof title != "string")
			throw new TypeError("Cannot set tournament title to a non-string.");

		return this.write(Keys.tournamentTitle(tournamentID), title);
	}

	/**
	 * Links this user to a tournament by its ID. After a user is linked to a tournament,
	 * they will be considered a "player" of that tournament.
	 *
	 * @param {User}   user         The user to add.
	 * @param {string} tournamentID The ID of the tournament to add this user to.
	 *
	 * @returns {undefined}
	 */
	addPlayer(user, tournamentID) {
		console.log(user);
		var key = Keys.tournamentPlayers(tournamentID);
		return this.fetch(key)
			.then(snapshot => {
				var userIDs = [];
				if(snapshot.exists()) {
					userIDs = snapshot.val();
				}
				if(userIDs.indexOf(user.id) == -1) {
					userIDs.push(user.id);
				}
				return this.write(key, userIDs, true);
			});
		//return this.write(Keys.tournamentPlayer(tournamentID, user.id), { rating: 0 });
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

	createMatch(tournamentID, userIDs, winners) {
		var time = Date.now();
		return this.writeNewMatch({
			tournament: tournamentID,
			time: time,
			users: userIDs,
			winners: winners
		});
	}

	setMatchTime(matchID, time) {
		return this.write(Keys.matchTime(matchID), time);
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
				if(
					obj.archived !== true &&
					(obj.tournament == null || obj.tournament == tournamentID)
				) {
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
							obj:        obj,
							id:         id,
							time:       Number(obj.time),
							users:      matchUsers,
							rounds:     matchRounds,
							numRounds:  Number(obj.set),
							tournament: tournamentID
						}));
					} else { // construct a match without rounds
						matches.push(shen.MatchSimple({
							obj:        obj,
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

	// fetchTournamentUsers(tournamentID) {
	// 	var key = `rankings/players/${ tournamentID }`;
	// 	return this.fetch(key).then((snapshot) => {
	// 		if(!snapshot.exists()) { // silently return empty array
	// 			return [];
	// 		}
	// 		// collect user IDs in this tournament
	// 		var userIDs = [];
	// 		snapshot.forEach(child => { userIDs.push(child.key); });
	//
	// 		// return users
	// 		return this.fetchUsers(userIDs);
	// 	});
	// }

	/**
	 * Reads the players that are in a tournament, and returns an array of players.
	 * In the case where the tournament exists but it still can't find any players,
	 * then an empty array will be returned.
	 *
	 * @throws {ReferenceError} if the tournamentID provided doesn't exist.
	 * @param  {string} tournamentID The ID of the tournament.
	 * @returns {Player[]} An array of players.
	 */
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
				let userIDs = [];
				snapshot.forEach(child => {
					let userID = child.val();
					userIDs.push(userID);
				});
				return this.fetchUser(userIDs);
			});
	}

	//endregion//

	//region// Game Database Functions /////////////////////////////////////////

	fetchGametype(gameID) {
		var key = `games/${ gameID }`;
		return this.fetch(key).then((snapshot) => {

			if(!snapshot.exists())
				throw new ReferenceError(`The gametype with ID ${ gameID } does not exist.`);

			var obj = snapshot.val();
			var title =      obj.title;
			var characters = obj.character;
			var stages =     obj.stage;
			return new Game({
				id: snapshot.key,
				title: title,
				compatabilities: ["character", "stage"], // TODO: read this from the database
				characters: characters,
				stages: stages,
			});
		});
	}

	writeGameProperty(gameID, property, value) {
		return this.write(Keys.gameProperty(gameID, property), value);
	}

	//endregion//

	//region// Discord Database Functions //////////////////////////////////////

	/**
	 * Attempts to find a user that is linked to the provided Discord user ID.
	 * If none of the IDs match, the promise will reject.
	 *
	 * @param  {string} discordID The ID of the Discord user.
	 * @return {Promise<User>} A promise to a user.
	 */
	fetchUserFromDiscordID(discordID) {
		return this.fetch(Keys.users).then(snapshot => {
			if(!snapshot.exists())
				throw new ReferenceError("Unable to read Users from database.");
			let user = null;
			snapshot.forEach(userSnapshot => {
				let userID = userSnapshot.key;
				let userObj = userSnapshot.val();
				if(userObj.discord == discordID) {
					user = this.constructUser(userID, userObj);
					return false;
				}
			});
			if(user == null)
				throw new ReferenceError("You are not linked to a Shen account.");
			return user;
		});
	}

	//endregion//
}

module.exports = FirebaseDatabase;
