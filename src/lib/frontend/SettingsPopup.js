const Utils = require("../Utils");
const Popup = require("./Popup");

module.exports = class SettingsPopup extends Popup
{
	static #settings = {
		"lang": {
			"trid": "language-setting",
			"type": "choice"
		},
		"first_repo": {
			"trid": "first-repo-setting",
			"type": "text"
		},
		"console": {
			"trid": "console-setting",
			"type": "check"
		},
		"multigame": {
			"trid": "multi-game-setting",
			"type": "check"
		},
		"dat_dump": {
			"trid": "dump-dat-setting",
			"type": "check"
		}
	}
	static popup = null;
	constructor(list)
	{
		super(askTranslation("settings-popup"));

		

		this.content = Utils.nodes.div();
	}
}