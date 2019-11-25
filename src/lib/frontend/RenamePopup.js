const Popup = require("./Popup");
const Utils = require("../Utils");

module.exports = class RenamePopup extends Popup
{
	#field = null;
	#submit = null;
	constructor(title, value)
	{
		super(title);

		this.#field = Utils.nodes.input("text", "rename-input");
		if(value)
			this.#field.value = value;
		this.#submit = Utils.nodes.input("button", "rename-submit", askTranslation("submit"));
		this.content = Utils.nodes.children(Utils.nodes.div("rename-content"), [this.#field, this.#submit]);
	}
	show()
	{
		super.show();
		this._promise = Promise.race([
			this._promise,
			new Promise(function(res, rej) {
				this.#field.addEventListener("keypress", e => { if(e.key === "Enter") res(); });
				this.#submit.addEventListener("click", res);
			}.bind(this))
		]).finally(this.hide.bind(this));
	}
	get value()
	{
		return this.#field.value;
	}
}