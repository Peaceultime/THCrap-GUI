const PatchManager = require("./PatchManager");
const ProfileManager = require("./ProfileManager");
const GameManager = require("./GameManager");
const Utils = require("../Utils");
const spawn = require('child_process').execFile;
const App = require("../App");
const Constants = require("../Constants");

module.exports = class Game
{
	#path = "";
	#id = null;
	#valid = false;
	constructor(id, path, valid = false)
	{
		this.#path = path;
		this.#id = id;
		this.#valid = valid;
	}
	check()
	{
		if(this.#valid)
			return Promise.resolve();

		const id = this.id, path = this.path;
		return Utils.lstat(path).then(function(stat) {
			if(stat.isFile() && PatchManager.sizes[stat.size])
				return Utils.sha256(path).then(function(sha) {
					let data = PatchManager.hashes[sha];
					return data && data[0] === id;
				});
		}).then(function(valid) {
			this.#valid = valid;
		}.bind(this)).catch(console.error);
	}
	change(path)
	{
		this.#path = path;
		return this.check();
	}
	launch(profile)
	{
		const vanilla = profile === undefined || profile.patch.size === 0;
		if(!vanilla)
		{
			App.send("game", "loading");
			Promise.allSettled([
				profile.file(),
				profile.download(function(e) { return Utils.required.path.dirname(e) === "." || e.startsWith(this.id + "/"); }.bind(this))
			]).catch(console.error).then(function() {
				console.log(Utils.required.path.join(process.cwd(), "src", "thcrap", "thcrap_loader.exe"), ["launch.js", this.path]);
				const child = spawn(Utils.required.path.join(process.cwd(), "src", "thcrap", "thcrap_loader.exe"), ["launch.js", this.path], {cwd: Utils.required.path.join(process.cwd(), "src", "thcrap")});

				App.running = true;
				App.win.minimize();

				if(Constants.DEBUG)
				{
					child.stdout.on('data', (data) => {
						console.log(`stdout: ${data}`);
					});

					child.stderr.on('data', (data) => {
						console.log(`stderr: ${data}`);
					});
				}

				child.on("exit", function() {
					App.send("game", "end");
					App.win.maximize();
				});
			}.bind(this));
		}
		else
		{
			const child = spawn(this.path, [], {cwd: Utils.required.path.dirname(this.path)});

			App.running = true;
			App.win.minimize();

			if(Constants.DEBUG)
			{
				child.stdout.on('data', (data) => {
					console.log(`stdout: ${data}`);
				});

				child.stderr.on('data', (data) => {
					console.log(`stderr: ${data}`);
				});
			}

			child.on("exit", function() {
				App.send("game", "end");
				App.win.maximize();
			});
		}
	}
	get id()
	{
		return this.#id;
	}
	get path()
	{
		return this.#path;
	}
	get valid()
	{
		return this.#valid;
	}
	get infos()
	{
		return Constants.GAME_DATA[this.#id];
	}
}