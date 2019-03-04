/**
 * @description Every functions must be commented to ensure full understanding of the software.
 * Note that a resolved promise can only have one argument, so if you want to return more arguments,
 * you must return an object.
 */
"use strict";

const remote = require('electron').remote;
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const URL = require('url');
const crypto = require("crypto");

var win = remote.getCurrentWindow();
const verbose = true;

const updateServers = ["https://aspect-code.net/touhouproject/download/thcrap/"];

var settings, translation;

var utils = {};
/**
 * Return the absolute path of the given path, even if it is already absolute
 * @param  {string} dest Destination path
 * @return {string}      Absolute destination path
 */
utils.absolute = function(dest)
{
	return (path.isAbsolute(dest) ? dest : path.join(__dirname, dest));
};
/**
 * Recursive mkdir. It don't prompt error on existant dirs like the recursive mkdir from fs.
 * @param  {String}   dest     Final directory
 * @param  {Function} callback Callback once the directories have been created
 */
utils.rmkdir = function(dest, callback)
{
	fs.mkdir(dest, function(err) {
		if(err && err.code !== "EEXIST" && err.code !== "ENOENT")
			callback(err);
		else if(err && err.code === "ENOENT")
			utils.rmkdir(path.normalize(path.join(dest, "..")), function() {
				utils.rmkdir(dest, callback);
			});
		else
		{
			if(verbose)
				console.log("Creating " + dest);

			callback();
		}
	});
};
/**
 * Handle basic requests (in http and https) from a given URL using a given method.
 * @param  {string} url    Fetched URL
 * @param  {string} method Request method, GET by default
 * @return {Promise}       Promise resolve on server response
 *         @param {IncomingMessage} resp IncomingMessage object coming from the server
 */
utils.request = function(url, method)
{
	if(typeof url !== "string")
		return Promise.reject(new TypeError("URL must be a <String>"));

	url = URL.parse(url);
	let request = {
		protocol: url.protocol,
		hostname: url.hostname,
		port: url.protocol === "https:" ? 443 : 80,
		path: url.pathname,
		method: method || 'GET'
	};

	if(verbose)
		console.log("Getting " + url.format() + " using " + request.method + " method");

	return new Promise(function(res, rej)
	{
		if(url.protocol == "https:")
		{
			https.request(request, function(resp) {
				res({"resp": resp});
			}).on("error", function(e) {
				rej(e);
			}).end();
		}
		else if(url.protocol == "http:")
		{
			http.request(request, function(resp) {
				res({"resp": resp});
			}).on("error", function(e) {
				rej(e)
			}).end();
		}
	});
};
/**
 * Download a file at the given URL using stream pipes.
 * @param  {string} url  Fetched URL
 * @param  {string} dest Destination file
 * @return {Promise}     Promise resolved when the download is finished
 */
utils.download = function(url, dest)
{
	if(typeof url !== "string" || typeof dest !== "string")
		return Promise.reject();

	return new Promise(function(res, rej) {
		utils.request(url).then(function(then) {
			utils.rmkdir(path.dirname(dest), function(e) {
				if(e)
					rej(e);
				else
				{
					if(verbose)
						console.log("Starting to save " + url + " in " + (path.isAbsolute(dest) ? dest : path.join(__dirname, dest)));

					let write = fs.createWriteStream(dest);
					then.resp.pipe(write);
					then.resp.on("end", function() {
						res();
					}).on("error", function(e) {
						rej(e);
					});
				}
			})
		}).catch(rej);
	});
};
/**
 * Get the file size from the given URL (using Content-Length header)
 * @param  {string} url Fetched URL
 * @return {Promise}    Promise resolved on server response
 *         @param {Array} size File size from the given URL
 */
utils.sizeof = function(url)
{
	return utils.request(url, "HEAD").then(function(then) {
		return Promise.resolve({"size": then.resp.headers["content-length"]});
	});
};
/**
 * Get all the data from the given URL
 * @param  {string}  url     Fetched URL
 * @param  {boolean} headers Optional, set it true to get the headers
 * @return {Promise}         Promise resolved when the download is finished
 *         @param {string} body    Downloaded data from the given URL
 *         @param {Array}  headers Headers from the given URL, undefined if headers not true
 */
utils.get = function(url, headers)
{
	let body = "";
	return new Promise(function(res, rej) {
		utils.request(url).then(function(then) {
			if(verbose)
				console.log("Start getting data");

			then.resp.setEncoding("utf8");
			then.resp.on("data", function(data) {
				body += data;
			});
			then.resp.on("end", function() {
				res({"body": body, "headers": (headers ? then.resp.headers : undefined)});
			});
			then.resp.on("error", function(e) {
				rej(e);
			});
		});
	});
};
/**
 * Fetch the object asynchroniously. Similar to Array.prototype.forEach(), but asynchrone.
 * @param  {Object|Array} object Fetch object, can be an object or an array
 * @param  {Function} callback   Function called at each iteration. This is the fetched object
 *         @param {Any} item		Item in the actual iteration
 *         @param {Any} key 		Key of the iteration
 *         @param {int} index 		Index of the iteration
 * @return {Promise}             Promise resolved when the fetching is over
 */
utils.for = function(object, callback)
{
	if(typeof object !== "object")
		return Promise.reject(new TypeError("object must be <Object> or <Array>"));
	if(typeof callback !== "function")
		return Promise.reject(new TypeError("callback must be <Function> (GeneratorFunction are not handle)"));

	let values = Object.values(object);
	let keys = Object.keys(object);
	let index = 0;

	if(values.length !== keys.length)
		return Promise.reject(new Error("Keys and values don't have the same length"));

	callback.bind(object);

	if(verbose)
		console.log("Iterating through ", object);

	let loop = function()
	{
		if(verbose)
			console.log("Iteration " + index);

		if(index == keys.length)
			return Promise.resolve();
		return callback(values[index], keys[index], index).then(function() { index++; return loop(); });
	};
	return loop();
};
/**
 * Replace the actual window with a new window from the given filename
 * @param  {string} file    File of the new window
 * @param  {Object} options Options for the window creation.
 * Check https://electronjs.org/docs/api/browser-window#new-browserwindowoptions
 * @return {Promise}	    Promise resolved when the window is created
 */
utils.window = function(file, options)
{
	win = new remote.BrowserWindow(Object.assign({}, options));
	win.loadURL(URL.format({
		pathname: utils.absolute(file),
		protocol: 'file:',
		slashes: true
	}));

	remote.getCurrentWindow().close();
};
/**
 * Add the given item at the first available slot in an array
 * @param  {Array} arr Filled array
 * @param  {Any} item  Given item
 * @return {int}       Return the id of the slot taken
 */
utils.fill = function(arr, item)
{
	if(!Array.isArray(arr))
		return;

	if(Array.isArray(item))
	{
		for(let i in item)
			utils.fill(arr, item[i]);
		return;
	}

	for(let i = 0; i < arr.length; i++)
	{
		if(arr[i] === undefined)
		{
			arr[i] = item;
			return i;
		}
	}
	arr.push(item);
	return arr.length - 1;
};
Array.prototype.fill = function(item)
{
	return utils.fill(this, item);
};
/**
 * Return the sha256 checksum of the given file
 * @param  {string} file Given filename
 * @return {string}      Promise resolved when the checksum is finished
 *         @param {string} sha256 SHA256 value
 */
utils.sha256 = function(file)
{
	return new Promise(function(res, rej) {
		const hash = crypto.createHash("sha256");

		const input = fs.createReadStream(file);
		input.on("readable", function() {
			const data = input.read();
			if(data)
				hash.update(data);
			else
				res(hash.digest('hex'));
		});
	});
}


/**
 * Class part
 *
 * PLEASE NOTE THAT EVERY VARIABLE STARTING WITH _ ARE SUPPOSE TO BE PRIVATE AND NOT USED OUTSIDE OF
 * THE CLASS ITSELF
 */



/**
 * Settings class, useful to quickly create, load, edit and save the settings
 */
utils.settings = class
{
	/**
	 * Constructor load settings or create default ones
	 * @return {Promise} Promise resolved when the settings are loaded or created
	 *         @param {utils.settings} this Settings object
	 */
	constructor()
	{
		this._settings = {
			"lang": "en",
			"first_repo": "http://thcrap.nmlgc.net/repos/nmlgc/"
		};

		return new Promise(function(res, rej) {
			fs.readFile(path.join(__dirname, "settings.json"), function(e, data) {
				if(e && e.code !== "ENOENT")
					rej(e);
				else if(e)
				{
					this._dirty = true;
					this.save().then(() => res(this));
				}
				else
				{
					try {
						this._settings = Object.seal(Object.assign(this._settings, JSON.parse(data)));
						this._dirty = false;
						res(this);
					} catch(e) {
						rej(e);
					}
				}
			}.bind(this));
		}.bind(this));
	}
	/**
	 * Get the data stored in settings with a given key
	 * @param {string} id Given id
	 */
	get(id)
	{
		return this._settings[id];
	}
	/**
	 * Set a new value for the given key, and allow saving new data if the new value is different
	 * from the previous one
	 * @param {string} id Given id
	 * @param {any} value New value
	 */
	set(id, value)
	{
		if(this._settings[id] != value)
		{
			this._settings[id] = value;
			this._dirty = true;
		}
	}
	/**
	 * Save the settings if they are different from the original ones
	 * @return {Promise} Promise resolved when the saving is finished
	 */
	save()
	{
		if(this._dirty)
		{
			return new Promise(function(res, rej) {
				fs.writeFile(path.join(__dirname, "settings.json"), JSON.stringify(this._settings), function(e) {
					if(e)
						rej(e);
					else
					{
						this._dirty = false;
						res();
					}
				}.bind(this));
			}.bind(this));
		}
	}
}
/**
 * Translation class, contain the language and all the translation data
 * It is designed to allow quick language changing
 */
utils.translation = class
{
	constructor(lang)
	{
		return this.changeLang(lang);
	}
	get lang()
	{
		return this._lang;
	}
	changeLang(lang)
	{
		this._lang = lang;

		return new Promise(function(res, rej) {
			fs.readFile(path.join(__dirname, "translation_files", this._lang, "lang.json"), function(e, data) {
				if(e)
					rej(e);
				else
				{
					try {
						this._cachedTranslation = Object.freeze(JSON.parse(data));
						res(this);
					} catch(e) {
						rej(e);
					}
				}
			}.bind(this));
		}.bind(this));
	}
	translation(id)
	{
		if(verbose)
			console.log("Translating " + id);

		return typeof this._cachedTranslation[id] !== "string" ? (new Error("Can't find translate value for id" + id)) : this._cachedTranslation[id];
	}
	translate()
	{
		let translatable = document.querySelectorAll("[trid]");

		if(verbose)
			console.log("Translation started");

		return utils.for(translatable, function(itm, key, index) {
			let translate = this.translation(itm.getAttribute("trid"));
			if(translate instanceof Error)
				return Promise.reject(translate);
			itm.textContent = (typeof translate === "undefined" ? "unknown" : translate);
			return Promise.resolve();
		}.bind(this));
	}
}
/**
 * Patches class, contain all the patches and repos datas, allow us to easily load and
 * download patches and repos.
 */
utils.patches = class
{
	/**
	 * Try to load datas from the files, if it can't, it will get all repos data then download
	 * everything
	 * @return {Promise} Promise resolved when all data are loaded
	 */
	constructor()
	{
		this._patches = {};
		this._repos = {};
		this._patchDetailsDOM = document.querySelector(".selected-patch");
		this._patchListDOM = document.querySelector(".patch-list .scrolling");
		this._changeButtonDOM = document.querySelector(".change-button");

		this._selectedPatch = null;

		if(!this._patchDetailsDOM || !this._patchListDOM || !this._changeButtonDOM)
			return Promise.reject();

		return new Promise(function(res, rej) {
			this.loadRepos().then(function() {
				this.loadPatches().then(function() {
					this.fetch(settings.get("first_repo")).then(function(urls) {
						this.download(urls).then(res).catch(rej);
					}.bind(this));
				}.bind(this));
			}.bind(this));
		}.bind(this)).then(function() {
			this._patchListDOM.innerHTML = "";

			for(let i in this._patches)
			{
				let node = document.createElement("div");
				node.setAttribute("patchid", i);
				node.textContent = i;
				node.classList.add("patch");
				node.onclick = function() { patches.select(this.getAttribute("patchid")); };
				this._patchListDOM.appendChild(node);
			}

			return Promise.resolve(this);
		}.bind(this));
	}
	/**
	 * Load all the repo data from file
	 * @return {Promise} Promise resolved when all repos have been loaded
	 */
	loadRepos()
	{
		return new Promise(function(res, rej) {
			utils.rmkdir(path.join(__dirname, "patches"), function() {
				fs.readdir(path.join(__dirname, "patches"), function(e, files) {
					if(e)
						rej(e);
					else
					{
						utils.for(files, function(itm, key, i) {
							return new Promise(function(_res, _rej) {
								fs.readFile(path.join(__dirname, "patches", itm, "repo.json"), function(_e, data) {
									if(_e)
										_rej(_e);
									else
									{
										try {
											this._repos[itm] = JSON.parse(data);
											_res();
										} catch(__e) {
											_rej(__e);
										}
									}
								}.bind(this));
							}.bind(this));
						}.bind(this)).then(res).catch(rej);
					}
				}.bind(this));
			}.bind(this));
		}.bind(this));
	}
	/**
	 * Load all the patches data from file using the repo data
	 * @return {Promise} Promise resolved when all patches have been loaded
	 */
	loadPatches()
	{
		return utils.for(this._repos, function(repo, name) {
			return new Promise(function(res, rej) {
				fs.readdir(path.join(__dirname, "patches", name), function(e, files) {
					if(e)
						rej(e);
					else
					{
						utils.for(files, function(itm, key, i) {
							if(itm === "repo.json")
								return Promise.resolve();
							return new Promise(function(_res, _rej) {
								fs.readFile(path.join(__dirname, "patches", name, itm, "patch.json"), function(_e, data) {
									if(_e)
										_rej(_e);
									else
									{
										try {
											this._patches[itm] = JSON.parse(data);
											_res();
										} catch(__e) {
											_rej(__e);
										}
									}
								}.bind(this));
							}.bind(this));
						}.bind(this)).then(res).catch(rej);
					}
				}.bind(this));
			}.bind(this));
		}.bind(this));
	}
	/**
	 * Get all the patches URL from the given URL, and save the repo data
	 * @param {string} url First repo URL, it's suppose to neighbor all other servers
	 * @return {Promise}   Promise resolved when all servers have been fetched
	 *         @param {Array} patches Array of patches URL
	 */
	fetch(url)
	{
		let fetch = [url];
		let fetched = [];
		let repos = {};

		let fetching = function() {
			return utils.get(fetch[0] + "/repo.js").then(function(data) {
				try {
					data = JSON.parse(data.body);
				} catch(e) {
					return Promise.reject(e);
				}

				this._repos[data.id] = Object.assign({}, this._repos[data.id]);

				let patches = {};
				for(let i in data.patches)
					if(!this._repos[data.id].patches || !this._repos[data.id].patches[i])
						patches[i] = fetch[0] + "/" + i;

				this._repos[data.id] = Object.assign(this._repos[data.id], data);

				repos[data.id] = patches;

				if(data.neighbors)
					for(let neighbor of data.neighbors)
						if(!fetched.includes(neighbor))
							fetch.push(neighbor);

				fetched.push(fetch[0]);
				fetch.splice(0, 1);
			}.bind(this)).then(function() {
				if(fetch.length == 0)
					return Promise.resolve(repos);
				else
					return fetching();
			});
		}.bind(this);
		return fetching();
	}
	/**
	 * Download and save patches data from the given URL array
	 * @param {Object} repos    Object containing repos
	 *        @param {Object}   For each repo, there is an object containing patch URL with their
	 *                          name as ID
	 * @return {Promise} Promise resolved when the download and save are finished
	 */
	download(repos)
	{
		return utils.for(repos, function(patches, repo) {
			return utils.for(patches, function(itm, key) {
				return utils.get(itm + "/patch.js").then(function(data) {

					try {
						this._patches[key] = JSON.parse(data.body);
						this._patches[key].repo = repo;

						if(verbose)
							console.log("Patch " + key + " loaded");

					} catch(e) {}
					return Promise.resolve();
				}.bind(this));
			}.bind(this))
		}.bind(this)).then(function() {
			return this.save();
		}.bind(this));
	}
	/**
	 * Save data in files
	 * @return {Promise} Promise resolved when all files have been succesfully saved
	 */
	save()
	{
		if(verbose)
			console.log("Saving patch data");

		return utils.for(this._repos, function(itm, key) {
			return new Promise(function(res, rej) {
				let dest = path.join(__dirname, "patches", key);
				utils.rmkdir(dest, function() {
					fs.writeFile(path.join(dest, "repo.json"), JSON.stringify(itm), function(e) {
						if(e)
							rej(e);
						else
						{
							if(verbose)
								console.log("Repo " + key + " saved");
							res();
						}
					});
				});
			});
		}).then(function() {
			return utils.for(this._patches, function(itm, key) {
				return new Promise(function(res, rej) {
					let dest = path.join(__dirname, "patches", itm.repo, key);
					utils.rmkdir(dest, function() {
						fs.writeFile(path.join(dest, "patch.json"), JSON.stringify(itm), function(e) {
							if(e)
								rej(e);
							else
							{
								if(verbose)
									console.log("Patch " + key + " saved");
								res();
							}
						});
					});
				});
			}.bind(this));
		}.bind(this));
	}
	/**
	 * [Need description]
	 * @param {string} id Selected patch ID
	 */
	select(id)
	{
		if(verbose)
			console.log("Selecting " + id);

		let patch = this._patches[id];
		this._patchDetailsDOM.querySelector('.selected-patch-title').textContent = id;
		this._patchDetailsDOM.querySelector('.selected-patch-origin').textContent = translation.translation('from-repo') + patch.repo;
		this._patchDetailsDOM.querySelector('.selected-patch-description').textContent = patch.title;
		this._patchDetailsDOM.querySelector('.selected-patch-dependencies').textContent =
		(patch.dependencies ? patch.dependencies.length + (patch.dependencies.length == 1 ? translation.translation('single-depend') : translation.translation('plural-depend')) : translation.translation("no-depend"));

		this._selectedPatch = id;
		this.refresh();
	}
	refresh()
	{
		let patch = this._patches[this._selectedPatch];
		if(profiles.hasPatch([profiles._selected], patch.id))
		{
			this._changeButtonDOM.setAttribute("trid", "change-remove-button");
			this._changeButtonDOM.textContent = translation.translation("change-remove-button");
			this._changeButtonDOM.onclick = function() {
				if(profiles.removePatch(profiles._selected, this.getAttribute("patch-id")))
				{
					patches.refresh();
					profiles.refresh();
				}
			}
		}
		else
		{
			this._changeButtonDOM.setAttribute("trid", "change-add-button");
			this._changeButtonDOM.textContent = translation.translation("change-add-button");
			this._changeButtonDOM.onclick = function() {
				if(profiles.addPatch(profiles._selected, this.getAttribute("patch-id")))
				{
					patches.refresh();
					profiles.refresh();
				}
			}
		}
		this._changeButtonDOM.setAttribute("patch-id", patch.id);
	}
	/**
	 * [Need description]
	 * @param {string} patch [Need description]
	 * @return {Array}       [Need description]
	 */
	dependencies(patch)
	{
		if(this._patches[patch])
		{
			let check = [], dependencies = [];
			for(let i in this._patches[patch].dependencies)
			{
				if(this._patches[patch].dependencies[i].includes("/"))
					check.push(this._patches[patch].dependencies[i].split("/")[1]);
				else
					check.push(this._patches[patch].dependencies[i]);
			}
			while(check.length != 0)
			{
				for(let i in this._patches[check[0]].dependencies)
				{
					patch = this._patches[check[0]].dependencies[i];
					if(!check.includes(patch) && !dependencies.includes(patch))
					{
						check.push(patch.split("/")[1]);
					}
				}
				if(!dependencies.includes(check[0]))
					dependencies.push(check[0]);
				check.splice(0, 1);
			}
			return dependencies;
		}
		return [];
	}
}
/**
 * Profiles class, contain all profiles data
 */
utils.profiles = class
{
	/**
	 * [Need description]
	 */
	constructor()
	{
		this._profiles = [];
		this._profileDOM = document.querySelector(".profile");
		this._dirty = false;

		this._selected = null;

		if(!this._profileDOM)
			return Promise.reject();

		return new Promise(function(res, rej) {
			fs.readFile(path.join(__dirname, "profiles.json"), function(e, data) {
				if(e && e.code != "ENOENT")
					rej(e);
				else if(e)
				{
					this._dirty = true;
					this.save().then(res).catch(rej);
				}
				else
				{
					try {
						this._profiles = JSON.parse(data);

						if(verbose)
							console.log("Profiles loaded");
					} catch(_e) {}
					res();
				}
			}.bind(this));
		}.bind(this)).then(function() { return Promise.resolve(this); }.bind(this));
	}
	/**
	 * [Need description]
	 * @param {string} name [Need description]
	 * @return {int}        Return the profile id
	 */
	add(name)
	{
		if(!name)
			return;

		this._dirty = true;

		return this._profiles.fill({
			"patches": [],
			"dependencies": [],
			"name": name
		});
	}
	/**
	 * [Need description]
	 * @param {int} id       [Need description]
	 * @param {string} patch [Need description]
	 * @return {boolean}     [Need description]
	 */
	addPatch(id, patch)
	{
		if(this._profiles[id])
		{
			this._dirty = true;
			this._profiles[id].patches.fill(patch);
			let dependencies = patches.dependencies(patch);
			for(let i in dependencies)
			{
				if(!this._profiles[id].patches.includes(dependencies[i]) && !this._profiles[id].dependencies.includes(dependencies[i]))
					this._profiles[id].dependencies.fill(dependencies[i]);
			}

			return true;
		}
		return false;
	}
	/**
	 * [Need description]
	 * @param {int} id       [Need description]
	 * @param {string} patch [Need description]
	 * @return {boolean}     [Need description]
	 */
	removePatch(id, patch)
	{
		if(this._profiles[id])
		{
			let i = this._profiles[id].patches.findIndex(function(e) { return e === patch; });
			if(i !== undefined)
			{
				this._dirty = true;

				delete this._profiles[id].patches[i];

				let dependencies = [];
				for(let i in this._profiles[this._selected].patches)
				{
					let patch = this._profiles[this._selected].patches[i];
					if(patch)
					{
						let dep = patches.dependencies(patch);
						for(let j in dep)
						{
							if(!dependencies.includes(dep[j]))
								dependencies.push(dep[j]);
						}
					}
				}
				this._profiles[this._selected].dependencies = dependencies;

				return true;
			}
		}
		return false;
	}
	/**
	 * [Need description]
	 * @param {int} id   [Need description]
	 * @return {boolean} [Need description]
	 */
	remove(id)
	{
		if(this._profiles[id])
		{
			this._dirty = true;

			return delete this._profiles[id];
		}
		return false;
	}
	/**
	 * [Need description]
	 * @return {Promise} [Need description]
	 */
	save()
	{
		if(this._dirty)
		{
			if(verbose)
				console.log("Saving profiles");

			return new Promise(function(res, rej) {
				fs.writeFile(path.join(__dirname, "profiles.json"), JSON.stringify(this._profiles), function(e) {
					if(e)
						rej(e);
					else
					{
						this._dirty = false;
						res();
					}
				}.bind(this));
			}.bind(this));
		}
		else
			return Promise.resolve();
	}
	/**
	 * [Need description]
	 * @param {int} id      [Need description]
	 * @param {string} name [Need description]
	 * @return {boolean}    [Need description]
	 */
	rename(id, name)
	{
		if(this._profiles[id])
		{
			this._profiles[id].name = name;
			this._dirty = true;

			return true;
		}
		return false;
	}
	/**
	 * [Need description]
	 * @param {int} id [Need description]
	 */
	select(id)
	{
		if(verbose)
			console.log("Selecting profile " + this._profiles[id].name);

		this._selected = id;
		this.refresh();
	}
	/**
	 *
	 */
	refresh()
	{
		let text_dependency = translation.translation("dependency");
		let text_from = translation.translation("from");

		this._profileDOM.querySelector(".profile-title").textContent = translation.translation("profile") + ": " + this._profiles[this._selected].name;
		let list = this._profileDOM.querySelector(".profile-patches-list");
		list.innerHTML = "";
		for(let i in this._profiles[this._selected].patches)
		{
			let patch = patches._patches[this._profiles[this._selected].patches[i]];
			let name = document.createElement("div");
			name.classList.add("patch-name");
			name.textContent = patch.id;
			let origin = document.createElement("div");
			origin.classList.add("patch-origin");
			origin.textContent = text_from + patch.repo;
			let node = document.createElement("div");
			node.appendChild(name);
			node.appendChild(origin);
			node.classList.add("profile-patch");
			node.setAttribute("patch_id", patch.id);
			node.onclick = function() { patches.select(this.getAttribute("patch_id")); };
			list.appendChild(node);
		}
		for(let i in this._profiles[this._selected].dependencies)
		{
			let patch = patches._patches[this._profiles[this._selected].dependencies[i]];
			if(!this._profiles[this._selected].patches.includes(patch.id))
			{
				let dependency = document.createElement("div");
				dependency.classList.add("patch-dependency");
				dependency.textContent = text_dependency;
				let name = document.createElement("div");
				name.classList.add("patch-name");
				name.textContent = patch.id;
				name.appendChild(dependency);
				let origin = document.createElement("div");
				origin.classList.add("patch-origin");
				origin.textContent = text_from + patch.repo;
				let node = document.createElement("div");
				node.appendChild(name);
				node.appendChild(origin);
				node.classList.add("profile-patch");
				node.setAttribute("patch_id", patch.id);
				node.onclick = function() { patches.select(this.getAttribute("patch_id")); };
				list.appendChild(node);
			}
		}
	}
	/**
	 * [Need description]
	 * @param {int} id       [Need description]
	 * @param {string} patch [Need description]
	 * @return {boolean}     [Need description]
	 */
	hasPatch(id, patch)
	{
		if(this._profiles[id])
			return !!this._profiles[id].patches.find(function(e) { return e === patch; });
		return false;
	}
}
/**
 * Games class, contain all games data, like name, version and path
 * Also contain the sha256 and size data for everygames
 */
utils.games = class
{
	/**
	 * [Need description]
	 * @todo
	 */
	constructor()
	{
		this._games = {};
		this._check = {};

		return new Promise(function(res, rej) {
			this.getCheck().then(function() {
				fs.readFile("games.json", function(e, data) {
					if(e)
						rej(e);
					else
					{
						try {
							this._games = Object.assign(this._games, JSON.parse(data));
							utils.for(this._games, this.check).then(function() { res(this); }).catch(rej);
						} catch(_e) {
							rej(_e);
						}
					}
				}.bind(this));
			}.bind(this));
		}.bind(this));
	}
	getCheck()
	{
		return new Promise(function(res, rej) {
			
		});
	}
	/**
	 * [Need description]
	 * @param {Object} game [Need description]
	 * @param {string} id   [Need description]
	 * @return {Promise}    [Need description]
	 */
	check(game, id)
	{
		return new Promise(function(res, rej) {
			fs.stat(game.gamePath, function(e, stat) {
				if(e)
					rej(e);
				if(stat.isFile() && this._check.sizes[stat.size])
				{
					utils.sha256(game.gamePath).then(function(sha) {
						let data = this._check.hashes[sha];
						this._games[id] = Object.assign(game, data);
						res();
					}.bind(this));
				}
				else
					res();
			}.bind(this));
		}.bind(this));
	}
	/**
	 * [Need description]
	 * @param {string} path [Need description]
	 * @todo
	 */
	search(path)
	{

	}
	/**
	 * [Need description]
	 * @param {string} id [Need description]
	 * @todo
	 */
	select(id)
	{

	}
	/**
	 * [Need description]
	 * @param {string} file [Need description]
	 * @param {string} id   [Need description]
	 */
	conflict(file, id)
	{

	}
}
