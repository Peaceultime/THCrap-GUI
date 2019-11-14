const Constants = require("./Constants");
const Utils = require("./Utils");

module.exports = class Updater
{
	static #authorized = false;
	static #updatable = {}; //Key: filename, value: url with appropriate server prefix
	static #web = null;
	static #status = false;
	static connection()
	{
		return Updater.#status
	}
	static setConnectionStatus(status)
	{
		Updater.#status = status;
	}
	static update(web)
	{
		Updater.#web = web;
		return Updater.check().then(() => Updater.download()).then(function() {
			Updater.#web.reload();
		}).catch(function() {
			Updater.#web.send("updating", Constants.STATE.LOADING);
			return;
		});
	}
	static check()
	{
		Updater.#web.send("updating", Constants.STATE.SEARCHING);
		return Promise.resolve();
	}
	static download()
	{
		if(!Updater.#authorized)
			return Promise.reject(new Error("You're not allowed to use this function like that."));

		const length = Object.keys(Updater.#updatable).length;
		if(length === 0)
			return Promise.resolve();

		Updater.#web.send("updating", Constants.STATE.UPDATING_START, length, "updating-crap");
		Updater.#web.session.clearCache();

		return Utils.for(Updater.#updatable, function(itm, key, idx) {
			return Utils.download(itm, Utils.required.path.join(key)).then(function() {
				Updater.#web.send("updating", Constants.STATE.UPDATING);
				return;
			});
		}).catch(function(err) {
			Updater.#web.send("updating", Constants.STATE.ERROR);
			console.error(err);
			return;
		});
	}
};