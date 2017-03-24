Shen Ranking System
===

The Shen Ranking System is a web application and API that manages tournaments for various competitive games and ranks players based on matches in that tournament, as well as provide statistics to players. While this project currently also has a Discord bot coded in, it should be moved to a separate repo when this project is in a finalized state.

Features
---

 - Client-side Webapp
 - Server-side API
 - RESTful API
 - Discord bot (provides Discord users direct access to server API, but should be moved to a separate project in the future and use the REST API)

For an in-depth explanation on how the ranking algorithms and statistics itself should work, read over the [Shen Rankings Specifications][1]. All algorithm-related contributions should follow these specifications. When adding new systems that will affect the rankings, it might first be specified in this document.

### Games
This system will allow creating (defining) **games** that can be used in tournaments.
Games should provide basic game-related information to tournaments such as:

 - The title of the game
 - The *compatabilities* the game has (does it support character selections? stages?)
 - Depending on the supported *compatabilities*, constants that provide avaliable selections (list of stages, characters, etc.)

### Ranking Profile
This system will allow defining user-defined profiles for the ranking algorithm that will be used for tournaments. This includes all the constants used when calculating player skill ratings, as well as the avaliable player skill groups.

### Tournaments

This system will allow creating **tournaments** for a specified game, that ranks players using a specified ranking profile. Tournaments provide a base of which users and matches can be added.

When a user is added to a tournament, they are now considered a **player** of that tournament.

While only [Ladder Tournaments](https://en.wikipedia.org/wiki/Ladder_tournament) are supported, traditional tournaments (maybe by using Challonge's API) should be supported in the future.

### Matches

This system will allow adding **matches** to a tournament. Matches should not only state which players participated and which players won for the purpose of the ranking algorithm, but should also provide additional statistical information such as the character used or stage picked (depending on the game) for the purpose of collecting player statistics.

An effecient and accurate method of reporting matches is a current topic of discussion, although we are currently reporting them using a physical form.

---

Installing
---

```sh
npm install https://github.com/branden-akana/shen
npm install
```

Running
---

To run, execute `npm start`.
Before running, be sure to have a valid `.env` file.

Environment File `.env`
---

These variables should be placed in a file named `.env` and located at the root of the project (the same place where `package.json` is).

### Firebase Variables
`FIREBASE_DATABASE_URL` - The link to your Firebase database

`FIREBASE_PROJECT_ID` - The ID of your Firebase project

`FIREBASE_CLIENT_EMAIL` - The email of your Firebase service account

`FIREBASE_PRIVATE_KEY` - The private key of your Firebase service account

### Discord Variables
`DISCORD_CLIENT_ID` - Your Discord bot client ID

`DISCORD_CLIENT_SECRET` - Your Discord bot client secret

`DISCORD_BOT_TOKEN` - Your Discord bot token

Contributing
---

While this the Shen Ranking System was initially established for Super Smash Bros. 4, the project aims to be compatible which any competitive game, which may include but is not limited to: traditional fighting games such as SF4 or MVC3, shooters such as CS:GO and Overwatch, or other games with a competitive scene such as Rocket League.

To that end, contributors to this project should keep an abstract perspective when adding new features as to prevent overwork in the future. For example, if you were to add character statistics support as a feature, be aware of games that don’t have characters such as Rocket League. Or if you wanted to support a game that has equipment loadouts like TF2, a good idea for a new feature would be to first add loadout statistics support.

[1]: https://docs.google.com/document/d/1qE7tT9CyrbBYPrbzQfF2Q7y0UX4lGbj8B4oySXrvOag/edit?usp=sharing
