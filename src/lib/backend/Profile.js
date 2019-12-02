const Utils = require("../Utils");
const PatchManager = require("./PatchManager");
const Settings = require("./Settings");
const Updater = require("../Updater");

module.exports = class Profile
{
	#patch = new Map();
	#depen = new Map();
	constructor(name, patch)
	{
		this.name = name;
		this.#patch = patch || new Map();

		if(patch)
			this.update();
	}
	add(patch)
	{
		this.#patch.set(patch.fullId, patch);

		this.update();
	}
	remove(patch)
	{
		if(this.#patch.has(patch.fullId))
			this.#patch.delete(patch.fullId);

		this.update();
	}
	update()
	{
		this.#depen = new Map();
		for(const [key, patch] of this.#patch)
		{
			const arr = [...patch.dependencies];
			for(const id of arr)
			{
				if(id.indexOf("/") == -1)
					id = patch.repo + "/" + id;
				if(!this.#depen.has(id))
				{
					const dep = PatchManager.get(id);
					this.#depen.set(id, dep);
					if(dep.dependencies)
						arr.push.apply([...dep.dependencies]);
				}
			}
		}
	}
	download(filter)
	{
		if(!Utils.status)
			return;
		return Utils.for(this.#patch, (patch) => patch.download(filter), undefined, false).then(function() {
			return Utils.for(this.#depen, (depen) => depen.download(filter), undefined, false);
		}.bind(this)).catch(console.error);
	}
	file()
	{
		return Utils.save(Utils.required.path.join("src", "thcrap", "config", "launch.js"), JSON.stringify({
			"console": Settings.get("console"),
			"dat_dump": Settings.get("dat_dump"),
			"patches": [...this.#patch.keys(), ...this.#depen.keys()].map(e => ({archive: "repos/" + e + "/"}))
		})).catch(console.error);
	}
	get patch()
	{
		return this.#patch;
	}
	get depen()
	{
		return this.#depen;
	}
}
