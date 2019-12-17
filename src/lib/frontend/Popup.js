const Utils = require("../Utils");

module.exports = class Popup
{
	#background = null;
	#wrapper = null;
	#header = null;
	#title = null;
	#close = null;
	constructor(title, headButtons = [])
	{
		this.#title = Utils.nodes.span("popup-title", title);
		this.#close = Utils.nodes.div("popup-close");

		this.#wrapper = Utils.nodes.div("popup-wrapper");
		const buttons = Utils.nodes.children(Utils.nodes.div("popup-header-buttons"), [...headButtons, this.#close]);
		this.#header = Utils.nodes.children(Utils.nodes.div("popup-header"), [this.#title, buttons]);

		this.#background = Utils.nodes.children(Utils.nodes.div("popup-background"), Utils.nodes.children(Utils.nodes.div("popup-foreground"), [
			this.#header,
			this.#wrapper
		]));
	}
	show()
	{
		document.appBody.append(this.#background);
		this._promise = new Promise(function(res, rej) {
			this.#close.addEventListener("click", rej, {once: true});
			this.#background.addEventListener("click", e => { if(e.path[0] === this.#background) rej(); });
		}.bind(this)).catch(function() {}).finally(this.hide.bind(this));
	}
	hide()
	{
		this.#background.classList.add("popup-fade");
		setTimeout(function(e) { if(e && e.parentNode) e.parentNode.removeChild(e) } , 500, this.#background);
	}
	get promise()
	{
		return this._promise;
	}
	set content(content)
	{
		const foreground = this.#wrapper.parentNode;
		foreground.removeChild(this.#wrapper);
		this.#wrapper = content;
		foreground.appendChild(content);
	}
	get content()
	{
		return this.#wrapper;
	}
	set title(title)
	{
		this.#title.textContent = title;
	}
	get title()
	{
		return this.#title.textContent;
	}
}
