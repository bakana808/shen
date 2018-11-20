
const express = require("express");
const router = express.Router();

// user-related routes
router.get("/profile", (req, res) => {
	var user = req.user;
	if(user == null) {
		res.redirect("/");
	} else {
		res.render("profile", { user: user });
	}
});

router.get("/session", (req, res) =>
{
	res.render("match_session", {
		user: req.user,
		Stages: ["test_stage1", "test_stage2"],
		Characters: ["test_char1", "test_char2"]
	});
});

router.get("/", (req, res) =>
{
	res.render("index", { user: req.user });
});

module.exports = router;
