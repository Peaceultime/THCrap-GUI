const Utils = require("../Utils");
const Popup = require("./Popup");
const Constants = require("../Constants");

module.exports = class GameSettingsPopup extends Popup
{
	constructor(id)
	{
		super(askTranslation("game-settings"));
	}
}