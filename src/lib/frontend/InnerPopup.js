module.exports = class InnerPopup
{
	#title;
	#content;
	#choices;
	#node;
	constructor(opts)
	{
		this.#title = opts.title || "";
		this.#content = opts.content || "";
		this.#choices = opts.choices || "";

		this.#node.addEventListener("click", function(e) {
			if(!e.path.includes(this.#foreground))
				this.fade();
		}.bind(this));
	}
}
