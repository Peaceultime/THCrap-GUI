const Utils = require("../Utils");
const Popup = require("./Popup");
const Constants = require("../Constants");
const {ipcRenderer} = require("electron");

module.exports = class GameSettingsPopup extends Popup
{
	#id = "";
	#game_data = {};
	#games = [];
	#selected_game = 0; //Tmp
	#config = [];
	#selected_config = 0; //Tmp
	constructor(id)
	{
		super(askTranslation("game-settings"));

		this.#id = id;
		this.#game_data = Constants.GAME_DATA[id];

		this.#games = ipcRenderer.sendSync("game", "ask", id);
		this.#config = ipcRenderer.sendSync("game", "ask", id + "_custom");

		const title = Utils.nodes.children(Utils.nodes.div("game-settings-title"), [Utils.nodes.div([], this.#game_data.title), Utils.nodes.div("jp-text", this.#game_data.jp), Utils.nodes.div([], "- " + this.#game_data.en)]);

		const game_group = Utils.nodes.children(Utils.nodes.div("game-settings-group"), [Utils.nodes.div("game-settings-text", (this.#games.length > 1 ? askTranslation("plural-game-found") : askTranslation("single-game-found")).replace("%s", this.#games.length))])

		this.content = Utils.nodes.children(Utils.nodes.div("game-settings-content"), [title, game_group/*, config_group, buttons*/]);
	}
}