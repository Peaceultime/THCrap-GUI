const Utils = require("../Utils");

module.exports = class Repo
{
	static #list = new Map();
	#name = "";
	#patch = new Map();
	#node = null;
	#head = null;
	static get(name)
	{
		return Repo.#list.get(name);
	}
	static has(name)
	{
		return Repo.#list.has(name);
	}
	static get list()
	{
		return Repo.#list.entries();
	}
	constructor(name)
	{
		this.#name = name;

		Repo.#list.set(name, this);
	}
	add(patch)
	{
		this.#patch.set(patch.fullId, patch);
	}
	toggle()
	{
		if(this.#node.classList.contains("repo-toggled"))
			for(const [name, patch] of this.#patch)
				patch.unselect();
		this.#node.classList.toggle("repo-toggled");
	}
	get node()
	{
		if(!this.#node)
		{
			this.#head = Utils.nodes.children(Utils.nodes.div("repo-header"), [Utils.nodes.div("repo-text", askTranslation("repo")), Utils.nodes.div("repo-name", this.#name), Utils.nodes.div("repo-patch", (this.#patch.size > 1 ? askTranslation("plural-patch") : askTranslation("single-patch")).replace("%s", this.#patch.size))]);
			this.#head.addEventListener("click", this.toggle.bind(this));
			this.#node = Utils.nodes.children(Utils.nodes.div("repo-content"), [this.#head, Utils.nodes.children(Utils.nodes.div("repo-patch-list"), Array.from(this.#patch.values(), e => e.node))]);
		}
		return this.#node;
	}
}
