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

var win = remote.getCurrentWindow();
const debug = true;
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
						this._settings = Object.assign(this._settings, JSON.parse(data));
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
						this._cachedTranslation = JSON.parse(data);
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
 * @todo
 */
utils.patches = class
{
	/**
	 * Try to load datas from the files, if it can't, it will get all repos data then download
	 * everything
	 * @return {Promise} Promise resolved when all data are loaded
	 * @todo
	 */
	constructor()
	{
		this._patches = {};
		this._repos = {};

		return new Promise(function(res, rej) {
			this.fetch(settings.get("first_repo")).then(function(urls) {
				this.download(urls).then(res).catch(rej);
			}.bind(this));
		}.bind(this));
	}
	/**
	 * Get all the patches URL from the given URL, and save the repo data
	 * @param {string} url First repo URL, it's suppose to neighbor all other servers
	 * @return {Promise}   Promise resolved when all servers have been fetched
	 *         @param {Array} patches Array of patches URL
	 * @todo
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

				let patches = {};
				for(let i in data.patches)
					patches[i] = fetch[0] + "/" + i;

				repos[data.id] = patches;
				if(data.neighbors)
					for(let neighbor of data.neighbors)
						if(!fetched.includes(neighbor))
							fetch.push(neighbor);

				fetched.push(fetch[0]);
				fetch.splice(0, 1);
			}).then(function() {
				if(fetch.length == 0)
					return Promise.resolve(repos);
				else
					return fetching();
			});
		};
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

						return Promise.resolve();
					} catch(e) {
						return Promise.reject();
					}
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

		return utils.for(this._patches, function(itm, key) {
			return new Promise(function(res, rej) {
				let dest = path.join(__dirname, "patches", itm.repo, key);
				utils.rmkdir(dest, function() {
					fs.writeFile(path.join(dest, "patch.js"), JSON.stringify(itm), function(e) {
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
		});
	}
	/**
	 *
	 * @param {string} id Selected patch ID
	 * @todo
	 */
	select(id)
	{

	}
}
/**
 * Profiles class, contain all profiles data
 */
utils.profiles = class
{
	/**
	 * @todo
	 */
	constructor()
	{

	}
	/**
	 *
	 * @return {Promise} [description]
	 *         @param {Object} [varname] [description]
	 * @todo
	 */
	add()
	{

	}
	/**
	 *
	 * @param {stirng} id [description]
	 * @return {Promise}  [description]
	 * @todo
	 */
	remove(id)
	{

	}
	/**
	 *
	 * @return {Promise} [description]
	 * @todo
	 */
	save()
	{

	}
	/**
	 *
	 * @param {string} id   [description]
	 * @param {string} name [description]
	 * @return {Promise}    [description]
	 * @todo
	 */
	rename(id, name)
	{

	}
	/**
	 *
	 * @param {string} id [description]
	 * @todo
	 */
	select(id)
	{

	}
}
/**
 * Games class, contain all games data, like name, version and path
 * Also contain the sha256 and size data for everygames
 */
utils.games = class
{
	/**
	 * @todo
	 */
	constructor()
	{

	}
	/**
	 *
	 * @param {string} path [description]
	 * @todo
	 */
	search(path)
	{

	}
	/**
	 *
	 * @param {string} id [description]
	 * @todo
	 */
	select(id)
	{

	}
}
