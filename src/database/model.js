
var shen = require("../shen");

/**
 * This class represents a model that can be written into the database.
 */
class DatabaseModel {
	dbWrite(overwrite = true) {
		shen.db.write(this.dbKey, this.dbModel, {overwrite: overwrite});
	}

	get id() { return null; }

	get dbKey() { return null; }

	get dbModel() { return JSON.parse(JSON.stringify(this)); }
}

module.exports = DatabaseModel;
