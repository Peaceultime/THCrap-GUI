const Utils = require("../Utils");
const Popup = require("./Popup");
const Constants = require("../Constants");
const GameSettingsPopup = require("./GameSettingsPopup");
const {ipcRenderer} = require("electron");

module.exports = class SettingsPopup extends Popup
{
	#groups = [];
	#languages = [
		{text: "English", value: "en"}
	]
	constructor()
	{
		super(askTranslation("settings-popup"));

		//General settings
		const language = this.dropdown(askTranslation("language-setting"), this.#languages, this.#languages.findIndex(e => e.value == askSetting("lang")), lang => ipcRenderer.send("settings", "lang", lang));
		const thcrap_console = this.checkbox(askTranslation("console-setting"), askSetting("console"), bool => ipcRenderer.send("settings", "console", bool));
		const dat_dump = this.checkbox(askTranslation("dump-dat-setting"), askSetting("dat_dump"), bool => ipcRenderer.send("settings", "dat_dump", bool));
		const repo = this.text(askTranslation("first-repo-setting"), askSetting("first_repo"), text => ipcRenderer.send("settings", "first_repo", text));
		this.#groups.push(this.group(askTranslation("general-group-setting"), [language, thcrap_console, dat_dump, repo]))

		//Games settings
		const games = [];
		for(const game in Constants.GAME_DATA)
		{
			if(!Constants.GAME_DATA.hasOwnProperty(game))
				continue;
			const node = Utils.nodes.div("setting-button", askTranslation("game-settings"));
			node.addEventListener("click", function() {
				new GameSettingsPopup(game).show();
			});
			games.push(Utils.nodes.children(Utils.nodes.div("setting"), [Utils.nodes.div("setting-label", Constants.GAME_DATA[game].title), node]))
		}
		this.#groups.push(this.group(askTranslation("game-group-setting"), games, ["game-group"]));

		this.content = Utils.nodes.children(Utils.nodes.div("settings-container"), this.#groups);
	}
	group(title, arr = [], classes = [])
	{
		return Utils.nodes.children(Utils.nodes.div(["settings-group", ...classes]), [Utils.nodes.children(Utils.nodes.div("settings-title"), [Utils.nodes.div("setting-title-text", title)]), Utils.nodes.children(Utils.nodes.div("settings-content"), arr)]);
	}
	dropdown(label, choices, index, callback)
	{
		const select = function()
		{
			dropdown.style.display = "none";
			const i = choices.findIndex(e => e.value == this.value);
			selected.textContent = choices[i].text;
			callback(this.value);
			build(i);
		}

		const dropdown = Utils.nodes.div("setting-dropdown-group");
		dropdown.style.display = "none";

		const selected = Utils.nodes.div(["setting-dropdown-value", "selected"], choices[index].text);
		selected.addEventListener("click", function() {
			dropdown.style.display = dropdown.style.display == "block" ? "none" : "block";
		});

		const build = function(i)
		{
			const values = [];
			for(const j in choices)
			{
				if(!choices.hasOwnProperty(j))
					continue;
				if(j == i)
					continue;
				const choice = Utils.nodes.div(["setting-dropdown-value", "selectable"], choices[j].text);
				choice.value = choices[j].value;
				choice.addEventListener("click", select);
				values.push(choice);
			}
			return Utils.nodes.children(Utils.nodes.nochild(dropdown), values);
		}

		return Utils.nodes.children(Utils.nodes.div("setting"), [Utils.nodes.div("setting-label", label), Utils.nodes.children(Utils.nodes.div("setting-dropdown"), [selected, build(index)])])
	}
	checkbox(label, state, callback)
	{
		const classes = ["setting-checkbox"];
		if(state)
			classes.push("checked");
		const check = Utils.nodes.div(classes);
		const node = Utils.nodes.children(Utils.nodes.div("setting"), [Utils.nodes.div("setting-label", label), check]);
		node.addEventListener("click", function() {
			check.classList.toggle("checked");
			callback(check.classList.contains("checked"));
		})
		return node;
	}
	text(label, text, callback)
	{
		const input = Utils.nodes.input("text", "setting-text", text);
		input.addEventListener("change", function() {
			callback(this.value);
		});
		return Utils.nodes.children(Utils.nodes.div("setting"), [Utils.nodes.div("setting-label", label), input]);
	}
}