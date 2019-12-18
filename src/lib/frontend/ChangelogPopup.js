const Utils = require("../Utils");
const Popup = require("./Popup");
const Constants = require("../Constants");
const {ipcRenderer} = require("electron");

module.exports = class ChangelogPopup extends Popup
{
	constructor()
	{
		super(askTranslation("changelog-popup"));

		

		this.content = Utils.nodes.children(Utils.nodes.div("changelog-content"), []);
	}
}
