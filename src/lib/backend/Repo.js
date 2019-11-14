const Patch = require("./Patch");
const Utils = require("../Utils");
const Constants = require("../Constants");
const App = require("../App");

module.exports = class Repo {
	#patches = new Map();
	#id = "";
	#obj = {};
	constructor(obj)
	{
		this.update(obj);
	}
	load()
	{
		//For every patch of this repo, try to read the patch.js file
			//If there is an error, there is no patch, so we ignore it
			//Else ceate a new Patch object out of it, and store it
		return Utils.for(this.#obj.patches, function(desc, patch, i) {
			return Utils.read(Utils.required.path.join("src", "thcrap", "repos", this.#id, patch, "patch.js")).then(function(data) {
				const p = new Patch(JSON.parse(data), this.#id);
				this.#patches.set(p.id, p);
				return p.load();
			}.bind(this));
		}, this, false);
	}
	download()
	{
		//Batch download the patch.js of every missing patches
			//On download, create a new Patch object and store it
		const patches = Object.keys(this.#obj.patches).filter(e => !this.#patches.has(e), this).map(e => "/" + e + "/patch.js");
		if(patches.length === 0)
			return Promise.resolve();

		App.send("updating", Constants.STATE.UPDATING_START, patches.length, "updating-patches");
		return Utils.batch(this.servers, patches, Utils.required.path.join("src", "thcrap", "repos", this.id), function(data) {
			data = JSON.parse(data);
			const p = new Patch(data, this.id);
			this.#patches.set(data.patch, p);
			App.send("updating", Constants.STATE.UPDATING);
			return p.setup();
		}.bind(this));
	}
	update(obj)
	{
		this.#id = obj.id;
		this.#obj = obj;

		return this;
	}
	get patches()
	{
		return this.#patches;
	}
	get id()
	{
		return this.#id;
	}
	get title()
	{
		return this.#obj.title;
	}
	get neighbors()
	{
		return this.#obj.neighbors;
	}
	get servers()
	{
		return this.#obj.servers;
	}
}