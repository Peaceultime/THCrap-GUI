const Constants = require("./Constants");
const Utils = require("./Utils");
const App = require("./App");

module.exports = class Updater
{
	static #servers = [];
	static #updatable = [];
	static #latest = 0;
	static #status = false;
	static connection()
	{
		return Updater.#status;
	}
	static setConnectionStatus(status)
	{
		Updater.#status = status;
	}
	static update()
	{
		App.send("updating", Constants.STATE.SEARCHING);
		return Promise.reject();

		/*let client, server;

		return Utils.read(Utils.required.path.join("src", "version.js")).then(function(data) {
			client = JSON.parse(data);
			return Utils.get(Updater.#servers, ["versions.js"], (d) => {server = JSON.parse(d)})
		}).then(function() {
			if(server.version === Constants.VERSION)
				return Promise.reject();;
			Updater.#latest = server.version;
			for(const [path, sha] of Object.entries(server.files))
				if(client[path] !== sha)
					Updater.#updatable.push(path);
			if(Updater.#updatable.length === 0)
				return Promise.reject();
			else
				return Updater.download();
		});*/
	}
	static download()
	{
		/*App.send("updating", Constants.STATE.UPDATING_START, Updater.#updatable.length, "updating-crap");
		App.win.webContent.session.clearCache();

		return Utils.batch(Updater.#servers, Updater.#updatable, () => { App.send("updating", Constants.STATE.UPDATING) }).catch(function(err) {
			App.send("updating", Constants.STATE.ERROR);
		}).then(function() {
			return Utils.batch(Updater.#servers, [...Array(Updater.#latest).keys()].map(i => i + Constants.VERSION));
		});*/
	}
	static install()
	{

	}
};