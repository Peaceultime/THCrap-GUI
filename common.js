/**
 * @description Every functions must be commented to ensure full understanding of the software.
 * Note that a resolved promise can only have one argument, so if you want to return more arguments,
 * you must return an object.
 */
"use strict";

const { remote } = require('electron');
const dialog = remote.dialog;
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
 * Create a node with the given tag, classes and append childrens, then return it
 * @param  {string} tag           Tag of the node
 * @param  {Array|string} classes Classes of the future node
 * @param  {Array|Node} childrens Childrens to append
 * @param  {string} text          TextContent of the node
 * @param  {Object} attributes    Attributes of the future node
 * @return {Node}                 Created node
 */
utils.node = function(tag, classes, childrens, text, attributes)
{
	if(!tag)
		return;
	let node = document.createElement(tag);
	if(classes)
	{
		if(Array.isArray(classes))
			DOMTokenList.prototype.add.apply(node.classList, classes);
		else if(typeof classes === "string")
			node.classList.add(classes);
	}
	if(childrens)
	{
		if(Array.isArray(childrens))
		{
			for(let i in childrens)
				if(childrens[i] instanceof Node)
					node.appendChild(childrens[i]);
		}
		else if(childrens instanceof Node)
			node.appendChild(childrens);
	}
	if(text && typeof text === "string")
		node.textContent = text;
	if(attributes && typeof attributes === "object")
		for(let i in attributes)
			node.setAttribute(i, attributes[i]);
	return node;
};



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
		this._settings = defaultSettings;

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
						fs.readFile(path.join(__dirname, "translation_files", this._lang, "posts.json"), function(e, data) {
							if(e)
								rej(e);
							else
							{
								try {
									this._cachedPosts = Object.freeze(JSON.parse(data));

									res(this);
								} catch(e) {
									rej(e);
								}
							}
						}.bind(this));
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
	post(id)
	{
		if(verbose)
			console.log("Translating post " + id);

		return typeof this._cachedPosts[id] !== "string" ? (new Error("Can't find translate post for id" + id)) : this._cachedPosts[id];
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
					}.bind(this)).catch(res);
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
			fs.readdir(path.join(__dirname, "patches"), function(e, files) {
				if(e)
					rej(e);
				else
				{
					utils.for(files, function(itm, key, i) {
						return new Promise(function(_res, _rej) {
							fs.readFile(path.join(__dirname, "patches", itm, "repo.json"), function(_e, data) {
								if(_e && _e.code != "ENOENT")
									_rej(_e);
								else if(_e)
									_res();
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
							return new Promise(function(_res, _rej) {
								fs.readFile(path.join(__dirname, "patches", name, itm, "patch.json"), function(_e, data) {
									if(_e && _e.code != "ENOENT")
										_rej(_e);
									else if(_e)
										_res();
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

		if(id !== null)
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
			if(!this._profiles[this._selected].patches[i])
			{
				delete this._profiles[this._selected].patches[i];
				continue;
			}
			if(verbose)
				console.log("Creating node for patch " + this._profiles[this._selected].patches[i]);
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
			if(!this._profiles[this._selected].dependencies[i])
			{
				delete this._profiles[this._selected].dependencies[i];
				continue;
			}
			if(verbose)
				console.log("Creating node for dependency " + this._profiles[this._selected].dependencies[i]);
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
		this.save();
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
	/**
	 * Display the profile selector, allowing to create, delete, rename and select profiles.
	 * @return {Promise} Promise resolved when a patch is selected
	 */
	display()
	{
		return new Promise(function(res, rej) {
			let addNode = function(i, profile)
			{
				let node = utils.node("div", "profile-wrapper", [
					utils.node("div", "popup-profile-title", [], profile.name),
					utils.node("div", "popup-profile-patches", [], profile.patches.length + (profile.patches.length > 1 ? translation.translation("plural-patch") : translation.translation("single-patch"))),
					utils.node("div", "popup-profile-depends", [], profile.dependencies.length + (profile.dependencies.length > 1 ? translation.translation("plural-depend") : translation.translation("single-depend")))
				]);
				node.profile = i;
				if(this._selected == i)
					node.classList.add("selected");
				node.addEventListener("click", function() {
					selectedProfile = this.profile;
					for(let j of this.parentElement.children)
						j.classList.remove("selected");
					this.classList.add("selected");
				});
				node.addEventListener("dblclick", function() {
					popup.close();
					res(selectedProfile);
				});

				return node;
			}

			let arr = [];
			let selectedProfile = this._selected;
			for(let i in this._profiles)
				arr.push(addNode.bind(this)(i, this._profiles[i]));
			let wrapper = utils.node("div", "popup-body-wrapper", arr);

			let select = utils.node("button", ["popup-button", "select-button"], [], "Select");
			select.addEventListener("click", function() {
				if(selectedProfile === null)
					return;
				popup.close();
				res(selectedProfile);
			});

			let add = utils.node("button", ["popup-button", "add-button"], [], "Add");
			add.addEventListener("click", function() {
				let i = this.add(translation.translation("new-profile"));
				wrapper.appendChild(addNode.bind(this)(i, this._profiles[i]))
			}.bind(this));

			let rename = utils.node("button", ["popup-button", "rename-button"], [], "Rename");
			rename.addEventListener("click", function() {
				if(selectedProfile === null)
					return;
				let input = utils.node("input", "popup-rename-field", [], null, {"type": "text", "value": this._profiles[selectedProfile].name});
				let button = utils.node("button", "popup-rename-button", [], translation.translation("confirm"));
				button.addEventListener("click", function() {
					this.rename(selectedProfile, input.value);
					wrapper.removeChild(wrapper.querySelector(".selected"));
					let node = addNode.bind(this)(selectedProfile, this._profiles[selectedProfile]);
					node.classList.add("selected");
					wrapper.appendChild(node);
					renamePopup.close();
				}.bind(this));
				let renamePopup = new utils.popup(translation.translation("rename"), [
						utils.node("div", "popup-rename-wrapper", [input, button])
					]);
			}.bind(this));

			let remove = utils.node("button", ["popup-button", "remove-button"], [], "Remove");
			remove.addEventListener("click", function() {
				if(selectedProfile !== null)
				{
					this.remove(selectedProfile);
					wrapper.removeChild(wrapper.querySelector(".selected"));
					selectedProfile = null;
				}
			}.bind(this));

			let popup = new utils.popup(translation.translation("profiles"), [wrapper,
					utils.node("div", "popup-buttons-wrapper", [select, add, rename, remove])]);
		}.bind(this));
	}
}
/**
 * Games class, contain all games data, like name, version and path
 * Also contain the sha256 and size data for every games
 */
utils.games = class
{
	/**
	 * [Need description]
	 */
	constructor()
	{
		this._spawn = require('child_process').execFile;
		this._games = {};
		this._check = {};
		this._running = false;

		this._gameListDOM = document.querySelector(".games-tab .scrolling");
		this._gameInfosDOM = document.querySelector(".game-details");

		return new Promise(function(res, rej) {
			fs.readFile("check.json", function(e, data) {
				if(e)
					rej(e);
				else
				{
					try {
						if(data)
							this._check = Object.assign(this._check, JSON.parse(data));

						fs.readFile("games.json", function(e, data) {
							if(e && e.code !== "ENOENT")
								rej(e);
							else
							{
								try {
									let games = {};
									if(data)
										games = Object.assign(this._games, JSON.parse(data));
									utils.for(games, this.check.bind(this)).then(function() { this.renderGames(); res(this); }.bind(this)).catch(rej);
								} catch(_e) {
									rej(_e);
								}
							}
						}.bind(this));
					} catch(_e) {
						rej(_e);
					}
				}
			}.bind(this));
		}.bind(this));
	}
	/**
	 * [Need description]
	 */
	renderGames()
	{
		for(let i in gameData)
		{
			let arr = [
				utils.node("div", "game-title", [], "Touhou " + (i < 10 ? "0" + i : i) + " - " + gameData[i].jp),
				utils.node("div", "game-version", [], this._games[i] && this._games[i][1] ? this._games[i][1] : "---"),
				utils.node("div", "game-english", [], gameData[i].en)
			];
			if(!this._games[i] || !this._games[i].gamePath)
				arr.push(utils.node("div", "game-warning", [utils.node("span", "warning-icon")], translation.translation("not-installed")));
			else if(!this._games[i][1])
				arr.push(utils.node("div", "game-warning", [utils.node("span", "warning-icon")], translation.translation("not-patchable")))
			let node = utils.node("div", "game-scroll", utils.node("div", "game-infos", [
				utils.node("span", "game-cover", [], null, {style: "background-image: url(img/" + i + ".jpg)"}),
				utils.node("div", "game-data", arr)
			]));
			node.gameId = i;
			node.addEventListener("click", function() {
				games.select(this.gameId);
			});
			this._gameListDOM.appendChild(node);
		}
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
			fs.stat(game, function(e, stat) {
				if(e)
					rej(e);
				if(stat.isFile() && this._check.sizes[stat.size])
				{
					utils.sha256(game).then(function(sha) {
						let data = this._check.hashes[sha];
						this._games[id] = Object.assign({}, data, {"gamePath": game});
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
	 * @param {string} dir [Need description]
	 * @todo
	 */
	search(dir)
	{
		if(!dir && !dir.length)
			return Promise.reject();

		var list = {};
		var fetch = dir;

		console.log(this._check);

		return new Promise(function(res, rej) {
			var loop = function(file)
			{
				new Promise(function(_res, _rej) {
					fs.lstat(file, function(e, stat) {
						if(e)
							_res();
						else if(stat.isDirectory())
						{
							fs.readdir(file, function(_e, files) {
								if(!_e)
									for(let i in files)
										fetch.push(path.join(file, files[i]));
								_res();
							});
						}
						else if(stat.isFile())
						{
							if(path.extname(file) === ".exe" && this._check.sizes[stat.size])
							{
								utils.sha256(file).then(function(sha) {
									if(this._check.hashes[sha])
									{
										if(!list[this._check.hashes[sha][0]])
											list[this._check.hashes[sha][0]] = [];
										list[this._check.hashes[sha][0]].push(file);
									}
									_res();
								}.bind(this));
							}
							else
								_res();
						}
						else
							_res();
					}.bind(this));
				}.bind(this)).then(function() {
					fetch.splice(0, 1);
					if(fetch.length)
						loop.bind(this)(fetch[0]);
					else
						res(list);
				}.bind(this)).catch(rej);
			}
			loop.bind(this)(fetch[0]);
		}.bind(this));
	}
	/**
	 * [Need description]
	 * @param {string} id [Need description]
	 * @todo
	 */
	select(id)
	{
		this._gameInfosDOM.gameId = id;
		let background = this._gameInfosDOM.children[0];
		background.style["background-image"] = "url(img/" + id + "gameplay.jpg)";
		background.children[0].textContent = "Touhou " + id;
		let wrapper = this._gameInfosDOM.children[1];
		wrapper.children[0].textContent = translation.post(id);
		let buttons = wrapper.querySelectorAll(".button-wrapper > button");
		for(let i of buttons)
			i.gameId = id;
		wrapper.querySelector(".more-wrapper").classList.remove("toggled");
	}
	/**
	 * [Need description]
	 * @param {string} file [Need description]
	 * @param {string} id   [Need description]
	 * @todo
	 */
	conflict(file, id)
	{

	}
	/**
	 * [Need description]
	 * @return {Promise} Promise resolved when the save is completed
	 */
	save()
	{
		let saved = {};
		for(let i in this._games)
			saved[i] = this._games[i].gamePath;
		return new Promise(function(res, rej) {
			fs.writeFile(path.join(__dirname, "games.json"), JSON.stringify(saved), function(e) {
				if(e)
					rej(e);
				else
					res();
			});
		});
	}
	/**
	 * Run a game. Can run both vanilla and patched game, using the selected profile.
	 * @param  {string} game 	 Id of the game
	 * @param  {boolean} vanilla If the game running vanilla or with patchs
	 * @return {Promise}		 Promise resolved when the game is closed
	 */
	launch(game, vanilla)
	{
		if(this._running)
			return Promise.reject(translation.translation("already-running"));
		if(!this._games[game] || !this._games[game].gamePath)
			return Promise.reject(translation.translation("not-installed"));
		let child;
		if(vanilla)
		{
			child = this._spawn(this._games[game].gamePath, [], {cwd: path.dirname(this._games[game].gamePath)});

			this._running = true;
			win.minimize();

			if(verbose)
			{
				child.stdout.on('data', (data) => {
					console.log(`stdout: ${data}`);
				});

				child.stderr.on('data', (data) => {
					console.log(`stderr: ${data}`);
				});
			}

			return new Promise(function(res, rej) {
				child.on('close', function(code) {
					if(verbose)
						console.log("Child process exited with code " + code);

					this._running = false;
					win.restore();
					res();
				}.bind(this));
			}.bind(this));
		}
		else
		{
			if(profiles._selected === null)
				return Promise.reject(translation.translation("no-profile"));
			else
			{
				let obj = {
					"console": settings.get("console"),
					"dat_dump": settings.get("dat_dump"),
					"patches": []
				};
				for(let i in profiles._profiles[profiles._selected].dependencies)
				{
					let depen = profiles._profiles[profiles._selected].dependencies[i];
					if(depen && !profiles._profiles[profiles._selected].patches.includes(depen))
						obj.patches.push({"archive": patches._patches[depen].repo + "/" + depen + "/"});
				}
				for(let i in profiles._profiles[profiles._selected].patches)
				{
					let patch = profiles._profiles[profiles._selected].patches[i];
					if(patch)
						obj.patches.push({"archive": patches._patches[patch].repo + "/" + patch + "/"});
				}
				return new Promise(function(res, rej) {
					fs.writeFile(path.join(__dirname, "patches", "launch.js"), JSON.stringify(obj), function(e) {
						if(e)
							rej(e);
						else
						{
							profiles.download().then(function() {
								child = this._spawn(path.join(__dirname, "patches",  "thcrap_loader.exe"), ["launch.js", this._games[game].gamePath], {cwd: path.join(__dirname, "patches")});

								this._running = true;
								win.minimize();

								if(verbose)
								{
									child.stdout.on('data', (data) => {
										console.log(`stdout: ${data}`);
									});

									child.stderr.on('data', (data) => {
										console.log(`stderr: ${data}`);
									});
								}

								child.on('close', function(code) {
									if(verbose)
										console.log("Child process exited with code " + code);

									this._running = false;
									win.restore();
									res();
								}.bind(this));
							}).catch(rej);
						}
					}.bind(this))
				}.bind(this));
			}
		}
	}
}
utils.popup = class
{
	/**
	 * Create a popup and append the given nodes inside
	 * @param  {string} title    Title of the popup
	 * @param  {Array|Node} node Appended nodes
	 */
	constructor(title, node)
	{
		this._closePromise = new Promise(function(res, rej) {
			this._res = res;
			this._rej = rej;
			let close = utils.node("span", "close-popup");
			close.addEventListener("click", function() {
				this.close();
			}.bind(this));

			let arr = [utils.node("div", "popup-title-wrapper", [
							utils.node("div", "popup-title", [], title),
							close
							]
						)];
			if(node)
			{
				if(Array.isArray(node))
				{
					for(let i in node)
						if(node[i] instanceof Node)
							arr.push(node[i]);
				}
				else if(node instanceof Node)
					arr.push(node);
			}
			this.main = utils.node("div", "background-container", utils.node("div", "foreground-popup", arr));
			document.body.appendChild(this.main);

			if(verbose)
				console.log("Spawning a new popup");
		}.bind(this));
	}
	close()
	{
		if(this.main)
			document.body.removeChild(this.main);
	}
	get promise()
	{
		return this._closePromise;
	}
}
