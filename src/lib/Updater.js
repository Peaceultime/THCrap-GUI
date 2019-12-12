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
		if(Constants.DEV)
			return Promise.reject();

		App.send("updating", Constants.STATE.SEARCHING);

		let client, server;

		return Utils.read(Utils.required.path.join("version.js")).then(function(data) {
			client = JSON.parse(data);
			return Utils.for(Updater.#servers, (serv) => { if(!server) return Utils.get(serv + "/version.js").then((d) => server = JSON.parse(d)); }, undefined, false);
		}, Updater.cancel).then(function() {
			Updater.#latest = server.version;
			if(Updater.#latest === client.version)
				return Promise.reject();
			for(const [path, sha] of Object.entries(server.files))
			{
				console.log(path, sha, client.files[path]);
				if(client.files[path] !== sha)
					Updater.#updatable.push(path);
			}
			console.log(client, server, Updater.#updatable);
			if(Updater.#updatable.length === 0)
				return Promise.reject();
			else
				return Updater.download();
		}).catch(Updater.cancel);
	}
	static download()
	{
		App.send("updating", Constants.STATE.UPDATING_START, Updater.#updatable.length, "updating-crap");

		return Utils.batch(Updater.#servers, Updater.#updatable.map(e => Updater.#latest + "/" + e), Utils.required.path.join("."), () => { App.send("updating", Constants.STATE.UPDATING) }).then(function(failed) {
			if(failed !== undefined && failed.length !== undefined && failed.length !== 0)
				return Promise.reject();
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
			return Utils.rmdir(Utils.required.path.join("tmp", "install"), true).catch(e => { if(e.code === "ENOENT") return Promise.resolve(); console.error("Can't delete 'tmp/install'", e); });
		});
	}
};
