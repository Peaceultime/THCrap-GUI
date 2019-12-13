const Utils = require("../Utils");
const Popup = require("./Popup");
const Constants = require("../Constants");
const {ipcRenderer} = require("electron");

module.exports = class GameSettingsPopup extends Popup
{
	#id = "";
	#gameData = {};
	#games = [];
	#selectedGame = 0; //Tmp
	#config = [];
	#selectedConfig = 0; //Tmp
	constructor(id)
	{
		super(askTranslation("game-settings"));

		this.#id = id;
		this.#gameData = Constants.GAME_DATA[id];

		const askGames = ipcRenderer.sendSync("game", "ask", id);
		this.#games = askGames.games;
		this.#selectedGame = askGames.default;
		const askConfig = ipcRenderer.sendSync("game", "ask", id + "_custom");
		this.#config = askConfig.games;
		this.#selectedConfig = askConfig.default;

		const title = Utils.nodes.children(Utils.nodes.div("game-settings-title"), [Utils.nodes.div([], this.#gameData.title), Utils.nodes.div("jp-text", this.#gameData.jp), Utils.nodes.div([], "- " + this.#gameData.en)]);

		const games = [];
		for(const i in this.#games)
		{
			if(!this.#games.hasOwnProperty(i))
				continue;
			const data = this.#games[i];
			const choice = Utils.nodes.div(this.#selectedGame == i ? ["game-settings-radio", "selected"] : "game-settings-radio");
			choice.addEventListener("click", function() {
				ipcRenderer.send("game", "default", {id: id, index: i});
			}.bind(this));
			const remove = Utils.nodes.div("game-settings-remove");
			const node = Utils.nodes.children(Utils.nodes.div("game-settings-game-line"), [choice, Utils.nodes.div("game-line-path", data[0]), Utils.nodes.div("game-line-version", data[2]), Utils.nodes.div("game-line-type", data[3]), remove]);
			node.setAttribute("title", data[0]);
			remove.addEventListener("click", function() {
				ipcRenderer.send("game", "remove", {id: id, index: i});
			});
			games.push(node);
		}
		const game_group = Utils.nodes.children(Utils.nodes.div("game-settings-group"), [Utils.nodes.div("game-settings-text", (this.#games.length > 1 ? askTranslation("plural-game-found") : askTranslation("single-game-found")).replace("%s", this.#games.length)), Utils.nodes.children(Utils.nodes.div("game-setting-game-group"), games)])

		this.content = Utils.nodes.children(Utils.nodes.div("game-settings-content"), [title, game_group/*, config_group, buttons*/]);
	}
}