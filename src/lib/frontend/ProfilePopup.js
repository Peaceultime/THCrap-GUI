const Utils = require("../Utils");
const Popup = require("./Popup");

module.exports = class ProfilePopup extends Popup
{
	static popup = null;
	#node = null;
	#add = null;
	#container = null;
	#lines = [];
	constructor()
	{
		super(askTranslation("profile-popup"));

		this.#add = Utils.nodes.div("profile-add");
		this.#add.addEventListener("click", this.add.bind(this));
		this.#container = Utils.nodes.div("profile-line-container");

		this.update();

		this.content = Utils.nodes.children(Utils.nodes.div("profile-content"), [this.#container, this.#add]);

		ProfilePopup.popup = this;
	}
	update()
	{
		Utils.nodes.nochild(this.#container);

		this.#lines = [];
		for(const [name, profile] of Profile.list)
			this.#lines.push(profile.line);

		Utils.nodes.children(this.#container, this.#lines);
	}
	add()
	{
		const popup = new RenamePopup(askTranslation("name-new-profile"));
		popup.show();
		popup.promise.then(function() {
			if(Profile.has(popup.value))
				new SidePopup(askTranslation("profile-name-exist"), {error: true});
			else if(!popup.value || popup.value.trim() === "" || Array.from(Profile.list, e => e[1]).includes(popup.value) || Profile.vanilla.name === popup.value)
				return;
			else
			{
				ipcRenderer.send("profile", "create", popup.value);
				new Profile(popup.value, []);
				this.update();
			}
		}.bind(this)).catch(function() {});
	}
}
