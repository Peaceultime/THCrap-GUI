const Constants = require("./Constants");
const Utils = require("./Utils");
const App = require("./App");

module.exports = class Updater
{
	static #servers = ["https://aspect-code.net/static/download/touhou_launcher/"];
	static #updatable = [];
	static #latest = 0;
	static update()
	{
		App.send("updating", Constants.STATE.SEARCHING);

		let client, server;

		return Utils.read(Utils.required.path.join("src", "version.js")).then(function(data) {
			client = JSON.parse(data);
			return Utils.for(Updater.#servers, (serv) => { if(!server) return Utils.get(serv + "/version.js").then((d) => server = JSON.parse(d)); }, undefined, false);
		}, Updater.cancel).then(function() {
			if(server.version === Constants.VERSION)
				return Promise.reject();
			Updater.#latest = server.version;
			for(const [path, sha] of Object.entries(server.files))
				if(client[path] !== sha)
					Updater.#updatable.push(path);
			if(Updater.#updatable.length === 0)
				return Promise.reject();
			else
				return Updater.download();
		}).catch(Updater.cancel);
	}
	static download()
	{
		App.send("updating", Constants.STATE.UPDATING_START, Updater.#updatable.length, "updating-crap");

		return Utils.batch(Updater.#servers, Updater.#updatable.map(e => Updater.#latest + "/" + e), Utils.required.path.join("tmp"), () => { App.send("updating", Constants.STATE.UPDATING) }).then(function(failed) {
			if(failed.length && failed.length !== 0)
				return Updater.cancel();
			return Utils.batch(Updater.#servers, [...Array(Updater.#latest - Constants.VERSION).keys()].map(i => (i + Constants.VERSION + 1) + "/install.js"), Utils.required.path.join("tmp", "install"));
		}, function(e) {
			App.send("updating", Constants.STATE.ERROR);
			return Promise.reject();
		}).then(function() {
			return Updater.install();
		});
	}
	static install()
	{
		return Utils.for([...Array(Updater.#latest - Constants.VERSION).keys()].map(i => (i + Constants.VERSION + 1)), function(version) {
			return require(Utils.required.path.join("tmp", "install", version, "install"))(App, Utils);
		}, undefined, false).then(function() {
			return Utils.rmdir(Utils.required.path.join("tmp", "install"), true);
		}).then(function() {
			return Utils.rename(Utils.required.path.join("tmp"), Utils.required.path.join("test"));
		});
	}
	static cancel(e)
	{
		return Utils.rmdir(Utils.required.path.join("tmp"), true).finally(() => {return Promise.reject()});
	}
};
