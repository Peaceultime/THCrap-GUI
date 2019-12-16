const Constants = require("./Constants");
const Utils = require("./Utils");
const App = require("./App");

module.exports = class Updater
{
	static #servers = ["https://aspect-code.net/static/download/touhou_launcher/"];
	static #client = [];
	static #updatable = [];
	static #latest = 0;
	static update()
	{
		if(Constants.DEV)
			return Promise.reject();

		App.send("updating", Constants.STATE.SEARCHING);

		let server;

		return Utils.read(Utils.required.path.join("version.js")).then(function(data) {
			Updater.#client = JSON.parse(data);
			return Utils.for(Updater.#servers, (serv) => { if(!server) return Utils.get(serv + "/version.js").then((d) => server = JSON.parse(d)); }, undefined, false);
		}, Updater.cancel).then(function() {
			Updater.#latest = server.version;
			if(Updater.#latest === Updater.#client.version)
				return Promise.reject();
			for(const [path, sha] of Object.entries(server.files))
				if(Updater.#client.files[path] !== sha)
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

		return Utils.batch(Updater.#servers.map(e => e + "/" + Updater.#latest + "/"), Updater.#updatable, Utils.required.path.join("."), () => { App.send("updating", Constants.STATE.UPDATING); }).then(function(failed) {
			return Utils.batch(Updater.#servers, [...Array(Updater.#latest - Updater.#client.version).keys()].map(i => (i + Updater.#client.version + 1) + "/install.js"), "install", console.log);
		}, function(e) {
			App.send("updating", Constants.STATE.ERROR);
			return Promise.reject();
		}).then(function() {
			return Updater.install();
		});
	}
	static install()
	{
		return Utils.for([...Array(Updater.#latest - Updater.#client.version).keys()].map(i => (i + Updater.#client.version + 1)), function(version) {
			return require(Utils.required.path.join("install", version, "install"))(App);
		}, undefined, false).then(function() {
			return Utils.rmdir(Utils.required.path.join("install"), true).catch(e => { if(e.code === "ENOENT") return Promise.resolve(); console.error("Can't delete 'install'", e); });
		});
	}
};
