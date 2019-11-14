const Utils = require("../Utils");
const ContextMenu = require("./ContextMenu");

module.exports = class Profile
{
	static #selected = null;
	static #list = new Map();
	static #default = askSetting("default-profile");
	static #vanilla = new Profile("Vanilla", []);
	#name = null;
	#patch = null;
	#node = null;
	#title = null;
	#number = null;
	#contextmenu = null;
	static get(name)
	{
		return Profile.#list.get(name);
	}
	static has(name)
	{
		return Profile.#list.has(name);
	}
	static selectDefault()
	{
		const profile = Profile.get(Profile.#default);
		if(profile)
			profile.select();
		else
			Profile.#vanilla.select();
	}
	static get list()
	{
		return Profile.#list.entries();
	}
	static get selected()
	{
		return Profile.#selected;
	}
	static get vanilla()
	{
		return Profile.#vanilla;
	}
	constructor(name, list)
	{
		this.#name = name;
		this.#patch = list;

		this.#title = Utils.nodes.div("profile-title");
		this.#number = Utils.nodes.div("profile-number");

		this.update();

		this.#node = Utils.nodes.children(Utils.nodes.div("profile-line"), [this.#title, this.#number]);
		this.#node.addEventListener("contextmenu", this.menu.bind(this));
		this.#node.addEventListener("dblclick", this.select.bind(this));

		if(name === "Vanilla")
			this.#contextmenu = new ContextMenu([{text: askTranslation("profile-select"), fn: this.select.bind(this)},
				{name: "default", text: askTranslation("profile-default"), fn: this.default.bind(this), switch: true, switchValue: Profile.#default === null},
			]);
		else
			this.#contextmenu = new ContextMenu([{text: askTranslation("profile-select"), fn: this.select.bind(this)},
				{text: askTranslation("profile-rename"), fn: this.rename.bind(this)},
				{text: askTranslation("profile-edit"), fn: this.edit.bind(this)},
				{name: "default", text: askTranslation("profile-default"), fn: this.default.bind(this), switch: true, switchValue: this.isDefault},
				{text: askTranslation("profile-delete"), fn: this.delete.bind(this)}
			]);

		Profile.#list.set(name, this);
	}
	update()
	{
		this.#title.textContent = this.#name;
		this.#number.textContent = (this.#patch.length > 1 ? askTranslation("plural-patch") : askTranslation("single-patch")).replace("%s", this.#patch.length);
	}
	menu(e)
	{
		e.preventDefault();

		let context;
		if(this === Profile.#vanilla)
			context = new ContextMenu([{text: askTranslation("profile-select"), fn: this.select.bind(this)},
				{name: "default", text: askTranslation("profile-default"), fn: this.default.bind(this), switch: true, switchValue: Profile.#default === null},
			]);
		else
			context = new ContextMenu([{text: this.isSelected ? askTranslation("profile-unselect") : askTranslation("profile-select"), fn: this.select.bind(this)},
				{text: askTranslation("profile-rename"), fn: this.rename.bind(this)},
				{text: askTranslation("profile-edit"), fn: this.edit.bind(this)},
				{name: "default", text: askTranslation("profile-default"), fn: this.default.bind(this), switch: true, switchValue: this.isDefault},
				{text: askTranslation("profile-delete"), fn: this.delete.bind(this)}
			]);
		context.show(e);
	}
	select()
	{
		if(Profile.#selected == this && Profile.#vanilla == this)
			return;
		if(Profile.#selected)
			Profile.#selected.unselect();
		if(Profile.#selected == this)
			Profile.#vanilla.select();
		else
		{
			Profile.#selected = this;
			this.#node.classList.add("profile-selected");
		}
	}
	unselect()
	{
		this.#node.classList.remove("profile-selected");
	}
	rename()
	{
		if(Profile.#vanilla == this)
			return;
		const rename = new RenamePopup(askTranslation("rename-profile", this.#name));
		rename.show();
		rename.promise.then(function() {
			console.log(rename.value);
			console.log(!rename.value, rename.value.trim() === "", Profile.#list.has(rename.value), Profile.#vanilla.name === rename.value);
			if(!rename.value || rename.value.trim() === "" || Profile.#list.has(rename.value) || Profile.#vanilla.name === rename.value)
				return;
			ipcRenderer.send("profile", "rename", {name: this.#name, newName: rename.value});

			this.#name = rename.value;

			Profile.#list.delete(this.#name);
			Profile.#list.set(rename.value, this);

			this.update();
			ProfilePopup.popup.update();
		}.bind(this));
	}
	edit()
	{
		if(Profile.#vanilla == this)
			return;
		//Show patch list popup with selection
		//Then get the selected patches
	}
	default(bool)
	{
		if(bool)
		{
			if(Profile.#vanilla == this)
				Profile.#default = null;
			else
				Profile.#default = this.#name;
			ipcRenderer.send("settings", "default-profile", Profile.#default);
		}
		else if(this.isDefault)
			Profile.#vanilla.default(true);
	}
	delete()
	{
		if(Profile.#vanilla == this)
			return;

		ipcRenderer.send("profile", "delete", this.#name);
		Profile.#list.delete(this.#name);
		ProfilePopup.popup.update();

		if(this.isDefault)
			Profile.#vanilla.default(true);
	}
	get name()
	{
		return this.#name;
	}
	get line()
	{
		return this.#node;
	}
	get isSelected()
	{
		return Profile.#selected === this;
	}
	get isDefault()
	{
		return Profile.#default === this.#name;
	}
}
