const Utils = require("../Utils");
const Popup = require("./Popup");
const Repo = require("./Repo");
const {ipcRenderer} = require("electron");

module.exports = class PatchListPopup extends Popup
{
	#node = null;
	#repos = [];
	#list = undefined;
	constructor(list)
	{
		const button = Utils.nodes.div("popup-header-refresh");
		button.setAttribute("title", askTranslation("update-patch"));
		button.addEventListener("click", () => ipcRenderer.send("patch", "update"));
		super(askTranslation("patch-list-popup"), [button]);

		if(!list)
			this.#repos = Array.from(Repo.list, e => {e[1].unselect(); return e[1].node});
		else
		{
			this.#repos = Array.from(Repo.list, e => {e[1].unselect(); return e[1].checknode});
			for(const [name, repo] of Repo.list)
				repo.check(list);
		}

		this.content = Utils.nodes.children(Utils.nodes.div("patch-list-content"), this.#repos);
	}
	get list()
	{
		return Array.from(Repo.list, e => e[1].list).flat();
	}
}
