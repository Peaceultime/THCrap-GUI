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
	static #games = new Map();
	static load()
	{
		return Utils.read(Utils.required.path.join("data", "games.json")).then(function(data) {
			const games = JSON.parse(data);
			return Utils.for(games, function(path, id) {
				const game = new Game(id, path);
				GameManager.#games.set(game.id, game);
				return game.check();
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
			if(GameManager.#games.has(args.id))
				GameManager.#games.get(args.id).launch(ProfileManager.get(args.profileId));
		}
		else if(request === "search")
		{
			if(!args)
				dialog.showOpenDialog({title: Translation.translate("search-title"), properties: ["openDirectory"]}).then(function(result) {
					if(result.cancelled)
						return;

					GameManager.search(result.filePaths[0]);
				});
		}
		else if(request === "edit")
		{
			let game = GameManager.#games.get(args.id), promise;
			if(!game)
				promise = GameManager.add(new Game(args.id, args.path));
			else
				promise = game.change(args.path);

			promise.then(function() {
				e.reply("game", "reply", GameManager.#games.get(args.id).valid);
				GameManager.save();
			}).catch(function(err) {
				e.reply("game", "reply", false, err);
			});
		}
		else if(request === "ask")
			GameManager.ask();
	}
	static add(game)
	{
		GameManager.#games.set(game.id, game);
		return game.check();
	}
	static search(dir)
	{
		return init(dir, PatchManager.checker).then(() => GameManager.save());
	}
	static save()
	{
		const obj = {};
		for(const [id, value] of GameManager.#games)
			if(value.valid)
				obj[id] = value.path;
		return Utils.save(Utils.required.path.join("data", "games.json"), JSON.stringify(obj))
	}
	static get(id)
	{
		return GameManager.#games.get(id);
	}
	static ask()
	{
		const obj = {};
		for(const key in Constants.GAME_DATA)
		{
			if(!Constants.GAME_DATA.hasOwnProperty(key))
				continue;
			const value = GameManager.#games.get(key);
			const custom = GameManager.#games.get(key + "_custom");
			obj[key] = value ? value.valid : false;
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
