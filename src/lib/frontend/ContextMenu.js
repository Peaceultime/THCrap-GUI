const ContextLine = require("./ContextLine");
const Utils = require("../Utils");

module.exports = class ContextMenu
{
	static #exposed = undefined;
	#items = {};
	#visible = false;
	#node = undefined;
	#lines = [];
	static load()
	{
		window.addEventListener("click", function(e) {
			if(ContextMenu.#exposed && e.target !== ContextMenu.#exposed)
			{
				ContextMenu.#exposed.hide();
				ContextMenu.#exposed = undefined;
			}
		});
		window.addEventListener("scroll", function(e) {
			if(ContextMenu.#exposed && e.target !== ContextMenu.#exposed)
			{
				ContextMenu.#exposed.hide();
				ContextMenu.#exposed = undefined;
			}
		});
	}
	constructor(items)
	{
		this.#node = Utils.nodes.div("context-menu");
		for(const item of items)
		{
			const line = new ContextLine(item, this);
			this.#lines.push(line);
			this.#node.append(line.node);
		}
	}
	show(e)
	{
		if(this.#visible)
		{
			this.#node.style.left = e.pageX + "px";
			this.#node.style.top = e.pageY + "px";
			return;
		}

		if(ContextMenu.#exposed && ContextMenu.#exposed.visible)
			ContextMenu.#exposed.hide();
		this.#node.style.left = e.pageX + "px";
		this.#node.style.top = e.pageY + "px";
		document.body.append(this.#node);
		this.#visible = true;
		ContextMenu.#exposed = this;
	}
	hide()
	{
		if(!this.#visible)
			return;
		document.body.removeChild(this.#node);
		this.#visible = false;
	}
	get visible()
	{
		return this.#visible;
	}
}
