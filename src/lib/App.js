const {BrowserWindow, ipcMain} = require("electron");
const Utils = require("./Utils");
const Constants = require("./Constants");

module.exports = class App
{
	static #win = null;
	static launch(path, settings)
	{
		let window = new BrowserWindow(settings);

		window.once('ready-to-show', window.show);
		window.on('closed', () => { window = null; });

		window.loadFile(path);

		if(App.#win)
			App.#win.close();
		App.#win = window;

		return window;
	}
	static send()
	{
		if(Constants.DEBUG)
			console.log("Sending ", ...arguments);

		if(App.#win)
			App.#win.webContents.send(...arguments);
	}
	static get win()
	{
		return App.#win;
	}
};
