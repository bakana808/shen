
var shen = require("../shen");

/**
 * This class contains all API-related HTTP routes.
 */
class ApiRouter {
	constructor(router) {
		this._router = router;

		router.get("/user/:id", (req, res) => {
			// attempt to find a user with this id
			shen.fetchUser(req.params.id).then((user) => {
				res.json({
					id: user.id,
					nickname: user.nickname
				});
			})
			.catch((error) => {
				res.json({
					error: error,
					id: req.params.id
				});
			});
		});

		router.get("/tournament/:tournyId", (request, response) => {
			var tournyId = request.params["tournyId"];
			var matchCount;

			shen.fetchTournament(tournyId)
			.then((tournament) => {
				return tournament.fetchMatchCount();
			})
			.then((matchCount) => {
				this.matchCount = matchCount;
			})
			.then(() => {
				response.header("Content-Type", "application/json");
				if(matchCount === null) {
					response.status(500).json({
						error: "That tournament does not exist."
					});
				} else {
					response.status(200).json({
						matchCount: matchCount
					});
				}
			});
		});
	}

	get router() { return this._router; }
}

module.exports = ApiRouter;
