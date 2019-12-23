const Utils = require("../Utils");

module.exports = class TutorialPopup
{
	#background = null;
	#skip = null;
	#next = null;
	#arrow = null;
	#promise = null;
	constructor(text)
	{
		this.#skip = Utils.nodes.div("tutorial-skip", askTranslation("skip-tutorial"));
		this.#next = Utils.nodes.div("tutorial-next", askTranslation("next-tutorial"));
		this.#arrow = Utils.nodes.div("tutorial-arrow");

		this.#background = Utils.nodes.children(Utils.nodes.div("popup-background"), Utils.nodes.children(Utils.nodes.div(["popup-foreground", "tutorial-popup"]), [
			Utils.nodes.div("tutorial-text", text),
			Utils.nodes.children(Utils.nodes.div("tutorial-buttons"), [this.#skip, this.#next])
		]));
	}
	show()
	{
		document.appBody.append(this.#background);
		this.#promise = new Promise(function(res, rej) {
			this.#skip.addEventListener("click", rej, {once: true});
			this.#next.addEventListener("click", res, {once: true});
		}.bind(this)).finally(this.hide.bind(this));
	}
	hide()
	{
		this.#background.classList.add("popup-fade");
		setTimeout(function(e) { if(e && e.parentNode) e.parentNode.removeChild(e) } , 500, this.#background);
	}
	get promise()
	{
		return this.#promise;
	}
}
