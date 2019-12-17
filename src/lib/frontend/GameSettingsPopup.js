const Utils = require("../Utils");
const Popup = require("./Popup");
const Constants = require("../Constants");
const {ipcRenderer} = require("electron");

module.exports = class GameSettingsPopup extends Popup
{
	#id = "";
	#gameData = {};
	#game = null;
	constructor(id)
	{
		super(askTranslation("game-settings"));

		this.#id = id;
		this.#gameData = Constants.GAME_DATA[id];
		this.#game = gameList.get(id);

		const askConfig = ipcRenderer.sendSync("game", "ask", id + "_custom");

		const title = Utils.nodes.children(Utils.nodes.div("game-settings-title"), [Utils.nodes.div([], this.#gameData.title), Utils.nodes.div("jp-text", this.#gameData.jp), Utils.nodes.div([], "- " + this.#gameData.en)]);

		const buildGames = function()
		{
			const askGames = ipcRenderer.sendSync("game", "ask", id);
			const games = [];
			for(const i in askGames.games)
			{
				if(!askGames.games.hasOwnProperty(i))
					continue;
				const data = askGames.games[i];
				const choice = Utils.nodes.div(askGames.default == i ? ["game-settings-radio", "selected"] : "game-settings-radio");
				choice.addEventListener("click", function() {
					ipcRenderer.send("game", "default", {id: id, index: i});
					Utils.nodes.children(Utils.nodes.nochild(gameGroup), [...buildGames().children]);
				}, {once: true});
				const remove = Utils.nodes.div("game-settings-remove");
				const node = Utils.nodes.children(Utils.nodes.div("game-settings-game-line"), [choice, Utils.nodes.div("game-line-path", data[0]), Utils.nodes.div("game-line-version", data[2]), Utils.nodes.div("game-line-type", data[3]), remove]);
				node.setAttribute("title", data[0]);
				remove.addEventListener("click", function() {
					ipcRenderer.send("game", "remove", {id: id, index: i});
					Utils.nodes.children(Utils.nodes.nochild(gameGroup), [...buildGames().children]);
					if(askGames.games.length === 1)
						gameList.get(id).update(false);
				}, {once: true});
				games.push(node);
			}
			return Utils.nodes.children(Utils.nodes.div("game-settings-group"), [Utils.nodes.div("game-settings-text", (askGames.games.length > 1 ? askTranslation("plural-game-found") : askTranslation("single-game-found")).replace("%s", askGames.games.length)), Utils.nodes.children(Utils.nodes.div("game-setting-game-group"), games)])
		}
		const gameGroup = buildGames();

		const buildConfig = function()
		{
			const askConfig = ipcRenderer.sendSync("game", "ask", id + "_custom");
			const config = [];
			for(const i in askConfig.games)
			{
				if(!askConfig.games.hasOwnProperty(i))
					continue;
				const data = askConfig.games[i];
				const choice = Utils.nodes.div(askConfig.default == i ? ["game-settings-radio", "selected"] : "game-settings-radio");
				choice.addEventListener("click", function() {
					ipcRenderer.send("game", "default", {id: id + "_custom", index: i});
					Utils.nodes.children(Utils.nodes.nochild(configGroup), [...buildConfig().children]);
				}, {once: true});
				const remove = Utils.nodes.div("game-settings-remove");
				const node = Utils.nodes.children(Utils.nodes.div("game-settings-game-line"), [choice, Utils.nodes.div("game-line-path", data[0]), Utils.nodes.div("game-line-version", data[2]), Utils.nodes.div("game-line-type", data[3]), remove]);
				node.setAttribute("title", data[0]);
				remove.addEventListener("click", function() {
					ipcRenderer.send("game", "remove", {id: id + "_custom", index: i});
					Utils.nodes.children(Utils.nodes.nochild(configGroup), [...buildConfig().children]);
					if(askConfig.games.length === 1)
						gameList.get(id).update(undefined, false);
				}, {once: true});
				config.push(node);
			}
			return Utils.nodes.children(Utils.nodes.div("game-settings-group"), [Utils.nodes.div("game-settings-text", (askConfig.games.length > 1 ? askTranslation("plural-config-found") : askTranslation("single-config-found")).replace("%s", askConfig.games.length)), Utils.nodes.children(Utils.nodes.div("game-setting-game-group"), config)])
		}
		const configGroup = buildConfig();

		this.content = Utils.nodes.children(Utils.nodes.div("game-settings-content"), [title, gameGroup, configGroup, /*buttons*/]);
	}
}
