const Utils = require("../Utils");
const Popup = require("./Popup");
const Repo = require("./Repo");

module.exports = class PatchListPopup extends Popup
{
	static popup = null;
	#node = null;
	#repos = [];
	#list = undefined;
	constructor(list)
	{
		super(askTranslation("patch-list-popup"));

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
