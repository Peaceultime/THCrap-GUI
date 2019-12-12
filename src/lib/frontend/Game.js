const Profile = require("./Profile");
const ContextMenu = require("./ContextMenu");
const Settings = require("../backend/Settings");
const {ipcRenderer} = require("electron");
const Utils = require("../Utils");
const GameSettingsPopup = require("./GameSettingsPopup");

module.exports = class Game
{
	static launched = false;
	#id = "";
	#installed = null;
	#custom = false;
	#node = undefined;
	#warning = undefined;
	constructor(id)
	{
		this.#id = id;

		const node = Utils.nodes.div("game-img");
		node.style.backgroundImage = "url(img/" + this.#id + ".jpg)";

		this.#node = Utils.nodes.children(Utils.nodes.div("game"), node);

		this.#node.addEventListener("click", this.clicked.bind(this));
		this.#node.addEventListener("contextmenu", this.menu.bind(this));
	}
	launch(isGame)
	{
		if(!this.#installed)
			return;
		if(Game.launched)
			new SidePopup(askTranslation("already-launched"), {error: true});
		else
		{
			Game.launched = true;
			ipcRenderer.send("game", "launch", {id: isGame ? this.#id : this.#id + "_custom", profileId: Profile.selected.name});
		}
	}
	clicked(e)
	{
		this.launch(true);
	}
	menu(e)
	{
		e.preventDefault();

		const actions = [];
		if(this.#installed)
			actions.push({text: askTranslation("play"), fn: () => this.launch(true)});
		if(this.#custom)
			actions.push({text: askTranslation("config"), fn: () => this.launch(false)});

		actions.push({text: askTranslation("game-settings"), fn: () => new GameSettingsPopup(this.#id).show()});
		new ContextMenu(actions).show(e);
	}
	update(installed, custom)
	{
		const change = installed !== undefined && this.#installed !== installed;
		if(change && !installed)
			this.warning(askTranslation("not-installed"));
		else if(change && installed)
			this.warning();
		if(installed !== undefined)
			this.#installed = installed;
		this.#custom = custom === undefined ? false : custom;
	}
	warning(msg, time)
	{
		if(time)
			setTimeout((game, warn) => game.warning(msg), time, this, this.#warning ? this.#warning.textContent : undefined);

		if(this.#warning)
		{
			this.#node.removeChild(this.#warning);
			this.#warning = undefined;
		}

		if(msg)
		{
			this.#warning = Utils.nodes.div(["warning", "game-warning"], msg);
			this.#node.append(this.#warning);
		}
	}
	get node()
	{
		return this.#node;
	}
}
