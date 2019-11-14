const Utils = require("../Utils");
const Popup = require("./Popup");
const Repo = require("./Repo");

module.exports = class PatchListPopup extends Popup
{
	static popup = null;
	#node = null;
	#repos = [];
	constructor(list)
	{
		super(askTranslation("patch-list-popup"));

		this.#repos = Array.from(Repo.list, e => e[1].node);

		this.content = Utils.nodes.children(Utils.nodes.div("patch-list-content"), this.#repos);
	}
}
