const Patch = require("./Patch");
const Repo = require("./Repo");
const Utils = require("../Utils");
const Updater = require("../Updater");
const Settings = require("./Settings");
const {ipcMain} = require("electron");
const App = require("../App");

module.exports = class PatchManager
{
	static #patches = new Map();
	static #repos = new Map();
	static #checker = {"hashes": {}, "sizes": {}};
	static load()
	{
		//Load repos, then
		//Download missing repos and patches from Internet, then
		//Store every patch and concat every version files from the patches
		return PatchManager.loadRepos().then(function() {
			if(Settings.get("update_patch"))
				return PatchManager.fetch(Settings.get("first_repo")).then(() => Utils.for(PatchManager.#repos, repo => repo.download), console.error);
		}, console.error).finally(function() {
			for(const [key, repo] of PatchManager.#repos)
			{
				for(const [k, patch] of repo.patches)
				{
					PatchManager.#patches.set(patch.fullId, patch);
					if(patch.version)
					{
						Object.assign(PatchManager.#checker.hashes, patch.version.hashes);
						Object.assign(PatchManager.#checker.sizes, patch.version.sizes);
					}
				}
			}
			ipcMain.on("patch", PatchManager.bind);
		});
	}
	static bind(e, request, args)
	{
		//Bind every listeners to the ipcMain
		if(request === "ask")
		{
			const obj = {};
			for(const [fullId, patch] of PatchManager.#patches)
				obj[fullId] = patch.title;
			e.reply("patch", "update", obj);
		}
		else if(request === "update")
		{
			App.send("patch", "patch-update", true);
			return PatchManager.fetch(Settings.get("first_repo")).then(function() {
				App.send("patch", "patch-update", PatchManager.#repos.size);
				return Utils.for(PatchManager.#repos, repo => { return repo.download().then(() => App.send("patch", "patch-update")) });
			}).then(function() {
				const obj = {};
				for(const [fullId, patch] of PatchManager.#patches)
					obj[fullId] = patch.title;
				e.reply("patch", "update", obj);
			});
		}
	}
	static loadRepos()
	{
		//Read the patches dir
		//Try to read the repo.json file for every result
			//If there is an error, then it's not a repo, so we ignore it
			//Else create a new Repo object from the file data and store it in the path manager
		return Utils.readdir(Utils.required.path.join("src", "thcrap", "repos")).then(function(files) {
			return Utils.for(files, function(file) {
				return Utils.read(Utils.required.path.join("src", "thcrap", "repos", file, "repo.js")).then(function(d) {
					const repo = new Repo(JSON.parse(d));
					PatchManager.#repos.set(repo.id, repo);
					return repo.load();
				});
			}, PatchManager, false).catch(() => Promise.resolve());
		});
	}
	static fetch(first)
	{
		first = first.endsWith("/") ? first.substr(0, first.length - 1) : first;
		const neighbors = [first], fetched = [];

		if(!Utils.status)
			return Promise.resolve();

		const dl = function(url) {
			return Utils.get(url + "/repo.js").then(function(data) {
				const obj = JSON.parse(data);
				const updated = PatchManager.#repos.has(obj.id);
				const repo = updated ? PatchManager.#repos.get(obj.id).update(obj) : new Repo(obj);
				PatchManager.#repos.set(repo.id, repo);

				fetched.push(neighbors.splice(0, 1)[0]);
				if(repo.neighbors)
					for(let n of repo.neighbors)
					{
						n = n.endsWith("/") ? n.substr(0, n.length - 1) : n;
						if(!fetched.includes(n) && !neighbors.includes(n))
							neighbors.push(n);
					}

				return Utils.save(Utils.required.path.join("src", "thcrap", "repos", repo.id, "repo.js"), data);
			});
		};

		const loop = function(url) {
			return new Promise(function(res, rej) {
				dl(url).then(function() {
					if(neighbors.length === 0)
						res();
					else
						loop(neighbors[0]).then(res, rej);
				}).catch(rej);
			})
		};

		return loop(first);
	}
	static get(id)
	{
		return PatchManager.#patches.get(id);
	}
	static get hashes()
	{
		return PatchManager.#checker.hashes;
	}
	static get sizes()
	{
		return PatchManager.#checker.sizes;
	}
	static get checker()
	{
		return PatchManager.#checker;
	}
	static get patches()
	{
		return PatchManager.#patches;
	}
	static get repos()
	{
		return PatchManager.#repos;
	}
}
