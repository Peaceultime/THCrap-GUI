const Game = require("./Game");
const ProfileManager = require("./ProfileManager");
const PatchManager = require("./PatchManager");
const Utils = require("../Utils");
const App = require("../App");
const Constants = require("../Constants");
const Translation = require("./Translation");
const {ipcMain, dialog} = require("electron");
/**
 * Games class, contain all games data, like name, version and path
 * Also contain the sha256 and size data for every games
 */
const GameManager = module.exports = class GameManager
{
	static #group = new Map();
	static #default = new Map();
	static load()
	{
		return Utils.read(Utils.required.path.join("data", "games.json")).then(function(data) {
			const games = JSON.parse(data);
			return Utils.for(games, function(group, id) {
				GameManager.#group.set(id, []);
				GameManager.#default.set(id, group.default);
				return Utils.for(group.games, function(path, i) {
					const game = new Game(id, path);
					return GameManager.add(game);
				}, undefined, false)
			}, undefined, false);
		}).catch(() => Promise.resolve()).finally(function() {
			ipcMain.on("game", GameManager.bind);
			GameManager.save();
		});
	}
	static bind(e, request, args)
	{
		if(request === "launch")
		{
			if(GameManager.#group.has(args.id) && GameManager.#group.get(args.id).length > 0)
				GameManager.get(args.id).launch(ProfileManager.get(args.profileId));
		}
		else if(request === "search")
		{
			if(!args)
			{
				const returned = dialog.showOpenDialog({title: Translation.translate("search-title"), properties: ["openDirectory"]});
				if(returned && returned.then)
					returned.then(function(result) {
						if(result.cancelled)
							return;

						GameManager.search(result.filePaths[0]);
					});
			}
		}
		else if(request === "ask")
		{
			if(!args)
				GameManager.ask();
			else
			{
				//Needs to be updated
				const group = GameManager.#group.get(args);
				if(group && group.length > 0)
				{
					const arr = [];
					for(const game of group)
						arr.push([game.path, ...game.data]);
					e.returnValue = arr;
				}
				else
					e.returnValue = [];
			}
		}
	}
	static add(game)
	{
		if(!GameManager.#group.has(game.id))
		{
			GameManager.#group.set(game.id, [game]);
			GameManager.#default.set(game.id, 0);
			console.log(GameManager.#group);
		}
		else
		{
			const group = GameManager.#group.get(game.id);
			group.push(game)
			GameManager.#group.set(game.id, group);
		}
		return game.check();
	}
	static search(dir)
	{
		return init(dir, PatchManager.checker).then(() => GameManager.save());
	}
	static save()
	{
		const obj = {};
		for(const [id, group] of GameManager.#group)
		{
			obj[id] = {};
			obj[id].games = [];
			obj[id].default = GameManager.#default.get(id);
			if(group && group.length > 0)
				for(const game of group)
					if(game.valid)
						obj[id].games.push(game.path);
		}
		return Utils.save(Utils.required.path.join("data", "games.json"), JSON.stringify(obj))
	}
	static get(id, index)
	{
		if(index === undefined)
			index = GameManager.#default.get(id);
		const group = GameManager.#group.get(id);
		return group ? group[index] : undefined;
	}
	static ask()
	{
		const obj = {};
		for(const key in Constants.GAME_DATA)
		{
			if(!Constants.GAME_DATA.hasOwnProperty(key))
				continue;
			const game = GameManager.get(key);
			const custom = GameManager.get(key + "_custom");
			obj[key] = game ? game.valid : false;
			obj[key + "_custom"] = custom ? custom.valid : false;
		}
		App.send("game", "update", obj);
	}
}

function search(file, reg)
{
	return Utils.lstat(file).then(function(stat) {
		if(stat.isDirectory())
			return Utils.readdir(file);
		else if(stat.isFile() && Utils.required.path.extname(file) === ".exe" && reg.sizes[stat.size])
		{
			return Utils.sha256(file).then(function(sha) {
				if(reg.hashes[sha])
				{
					App.send("game", "search", {found: reg.hashes[sha][0]});
					GameManager.add(new Game(reg.hashes[sha][0], file, true));
				}
			});
		}
	}).catch(console.error);
}
function init(path, reg)
{
	if(!path || !reg || !reg.hashes || !reg.sizes)
		return GameManager.ask();

	App.send("game", "search", {start: true});
	const list = [path];

	const loop = function(path) {
		return search(path, reg).then(function(result) {
			if(result)
				for(const file of result)
					list.push(Utils.required.path.join(path, file));
		}).finally(function() {
			list.splice(0, 1);
			if(list.length)
				return loop(list[0]);
			else
				App.send("game", "search", {end: true});
		});
	};
	return loop(path);
}
