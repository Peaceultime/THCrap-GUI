const Utils = require("../Utils");
const App = require("../App");

module.exports = class Patch
{
	#id = "";
	#fullId = ""; //= repo + / + id
	#repo = "";
	#version = null;
	#checksum = {};
	#obj = {};
	constructor(obj, repo)
	{
		this.#id = obj.id;
		this.#repo = repo;
		this.#obj = obj;
		this.#fullId = this.#repo + "/" + this.#id;
	}
	load()
	{
		return Promise.all([
			Utils.read(Utils.required.path.join("src", "thcrap", "repos", this.#repo, this.#id, "versions.js")).then(function(d) { this.#version = JSON.parse(d); }.bind(this)), 
			Utils.read(Utils.required.path.join("src", "thcrap", "repos", this.#repo, this.#id, "files.js")).then(function(d) { this.#checksum = JSON.parse(d); }.bind(this))
		]);
	}
	setup()
	{
		return Utils.batch(this.#obj.servers, ["versions.js"], Utils.required.path.join("src", "thcrap", "repos", this.#repo, this.#id), function(data, file) {
			this.#version = JSON.parse(data);
		}.bind(this));
	}
	download(filter)
	{
		let files;
		return Utils.for(this.#obj.servers, function(itm) {
			if(!files)
				return Utils.get(itm + "files.js").then(function(data) {
					files = JSON.parse(data);
				});
		}, this).then(function() {
			const arr = Object.keys(files).filter(e => files[e] != null && (this.#checksum[e] == undefined || files[e] !== this.#checksum[e]), this).filter(filter);
			for(const file of arr)
			{
				if(files[file] === null)
					delete this.#checksum[file];
				this.#checksum[file] = files[file];
			}
			App.send("patch", "startdownload", {patch: this.fullId, file: arr[0], length: arr.length});
			return Utils.batch(this.#obj.servers, arr, Utils.required.path.join("src", "thcrap", "repos", this.#repo, this.#id), function(data, file, i) {
				i = parseInt(i);
				if(arr[i + 1])
					App.send("patch", "download", {file: arr[i + 1]});
			}).catch(console.error).then(function() {
				return Utils.save(Utils.required.path.join("src", "thcrap", "repos", this.#repo, this.#id, "files.js"), JSON.stringify(this.#checksum));
			}.bind(this));
		}.bind(this));
	}
	get id()
	{
		return this.#id;
	}
	get repo()
	{
		return this.#repo;
	}
	get fullId()
	{
		return this.#fullId;
	}
	get version()
	{
		return this.#version;
	}
	get dependencies()
	{
		return this.#obj.dependencies;
	}
	get title()
	{
		return this.#obj.title;
	}
}