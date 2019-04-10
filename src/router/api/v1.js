
const express = require("express");
const router  = express.Router();

router.post("/api/v1/logout", (req, res) => {

	if(req.session.user) {

		console.log("the user " + req.session.user.tag + " is ending their session");
		
		req.session.destroy();
		res.status(201).end();
	}
	else {

		res.status(401).end();
	}
});

router.get("/api/v1/get-id", (req, res) => {

	var user = req.session.user;
	if(!user) {

		res.status(401).send({ success: "false" });
	}
	else {

		res.status(200);
		res.json({
			success: "true",
			message: {
				uuid: user.uuid,
				name: user.name,
				tag: user.tag
			}
		});
	}
});

module.exports = router;

