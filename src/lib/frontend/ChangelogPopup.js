const Utils = require("../Utils");
const Popup = require("./Popup");
const Constants = require("../Constants");
const {ipcRenderer} = require("electron");

module.exports = class ChangelogPopup extends Popup
{
	constructor(changelog)
	{
		super(askTranslation("changelog-popup"));
	
		const nodes = [];
		changelog.reverse();
		for(const log of changelog)
		{
			const version = Utils.nodes.div("log-version", askTranslation("version").replace("%s", log.version) + (log.hotfix ? (" - " + askTranslation("hotfix")) : ""));
			const list = Utils.nodes.children(Utils.nodes.div("log-list"), log.list.map(e => Utils.nodes.div("log", e)));
			const node = Utils.nodes.children(Utils.nodes.div("log-group"), [version, list]);
			nodes.push(node);
		}

		this.content = Utils.nodes.children(Utils.nodes.div("changelog-content"), nodes);
	}
}
