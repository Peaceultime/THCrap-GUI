const Utils = require("../Utils");
const Popup = require("./Popup");
const Constants = require("../Constants");
const {ipcRenderer} = require("electron");

module.exports = class ChangelogPopup extends Popup
{
	constructor()
	{
		super(askTranslation("changelog-popup"));

		/*
		
		<div class="changelog-content">
			<div class="log-group log-hotfix">
				<div class="log-version">Version 1.1.1 - Hotfix</div>
				<div class="log-list">
					<div class="log">Fix an Internet connection bug</div>
				</div>
			</div>
			<div class="log-group">
				<div class="log-version">Version 1.1.0</div>
				<div class="log-list">
					<div class="log">Add changelog</div>
					<div class="log">Add setting to skip patch update furing start</div>
					<div class="log">Add button in patch list to update patches</div>
				</div>
			</div>
		</div>
		
		*/

		this.content = Utils.nodes.children(Utils.nodes.div("changelog-content"), []);
	}
}
