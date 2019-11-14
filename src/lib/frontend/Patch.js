const Utils = require("../Utils");

module.exports = class Patch
{
	static #list = new Map();
	#id = "";
	#repo = "";
	#fullId = "";
	#title = "";
	#node = null;
	static get(name)
	{
		return Patch.#list.get(name);
	}
	static get list()
	{
		return Patch.#list.entries();
	}
	constructor(fullId, title)
	{
		this.#fullId = fullId;
		fullId = fullId.split("/");
		this.#repo = fullId[0];
		this.#id = fullId[1];
		this.#title = title;

		Patch.#list.set(this.#fullId, this);

		this.#node = Utils.nodes.children(Utils.nodes.div("patch-content"), [Utils.nodes.div("patch-name", this.#id), Utils.nodes.div("patch-title", this.#title)]);
		this.#node.addEventListener("click", this.select.bind(this));
	}
	select()
	{
		for(const [id, patch] of Patch.list)
			patch.unselect();
		this.#node.classList.add("patch-selected");
	}
	unselect()
	{
		this.#node.classList.remove("patch-selected");
	}
	get id()
	{
		return this.#id;
	}
	get repo()
	{
		return this.#repo;
	}
	get fullId()
	{
		return this.#fullId;
	}
	get node()
	{
		return this.#node;
	}
}
