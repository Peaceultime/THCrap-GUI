const Profile = require("./Profile");
const PatchManager = require("./PatchManager");
const Utils = require("../Utils");
const {ipcMain} = require("electron");

module.exports = class ProfileManager
{
	static #profiles = new Map();
	static load()
	{
		return Utils.read(Utils.required.path.join("data", "profiles.json")).then(function(data) {
			const result = JSON.parse(data);
			for(const profile of result)
				ProfileManager.#profiles.set(profile.name, new Profile(profile.name, new Map(profile.patch.map(e => [e, PatchManager.get(e)]))));
		}).catch(() => Promise.resolve()).finally(function() {
			ipcMain.on("profile", ProfileManager.bind);
		});
	}
	static bind(e, request, args)
	{
		if(request === "add")
			ProfileManager.get(args.name).add(PatchManager.get(args.patchId));
		else if(request === "remove")
			ProfileManager.get(args.name).remove(PatchManager.get(args.patchId));
		else if(request === "delete")
			ProfileManager.#profiles.delete(args);
		else if(request === "rename")
		{
			const profile = ProfileManager.get(args.name);
			ProfileManager.#profiles.delete(args.name);
			profile.name = args.newName;
			ProfileManager.#profiles.set(profile.name, profile);
		}
		else if(request === "create")
			ProfileManager.#profiles.set(args, new Profile(args));
		else if(request === "ask")
		{
			const obj = {};
			for(const [id, profile] of ProfileManager.#profiles)
				obj[profile.name] = Array.from(profile.patch.keys());
			e.reply("profile", "update", obj);
			return;
		}
		ProfileManager.save().then(function() {
			e.reply("profile", "reply", true);
		}).catch(function(err) {
			e.reply("profile", "reply", false, err);
		});
	}
	static save()
	{
		return Utils.save(Utils.required.path.join("data", "profiles.json"), JSON.stringify([...ProfileManager.#profiles.values()].map(e => { return {"name": e.name, "patch": [...e.patch.keys()]} })));
	}
	static get(name)
	{
		return ProfileManager.#profiles.get(name);
	}
}
