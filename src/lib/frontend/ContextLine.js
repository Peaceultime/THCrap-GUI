const Utils = require("../Utils");

module.exports = class ContextLine
{
	#node = null;
	#parent = null;
	#state = undefined;
	#switch = false;
	#fn = null;
	#name = "";
	constructor(opts, parent)
	{
		this.#node = Utils.nodes.div("context-choice", opts.text);
		this.#parent = parent;
		this.#fn = opts.fn;
		this.#name = opts.name;

		if(opts.switch)
		{
			this.#state = opts.switchValue || false;
			this.#switch = true;
		}
		if(opts.switch && opts.switchValue)
			this.#node.classList.add("context-switched");

		this.#node.addEventListener("click", this.clicked.bind(this));
	}
	clicked()
	{
		this.toggle();
		this.#fn(this.#state);
		this.#parent.hide();
	}
	toggle()
	{
		if(this.#switch)
		{
			this.#state = !this.#state;
			this.#node.classList.toggle("context-switched");
		}
	}
	get node()
	{
		return this.#node;
	}
	get state()
	{
		return this.#state;
	}
	get name()
	{
		return this.#name;
	}
}
