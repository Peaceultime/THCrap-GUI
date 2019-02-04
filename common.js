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
	if(verbose)
		console.log("Creating " + dest);

	fs.mkdir(dest, function(err) {
		if(err && err.code !== "EEXIST" && err.code !== "ENOENT")
			callback(err);
		else if(err && err.code === "ENOENT")
			dirTest(path.normalize(path.join(dir, "..")), function() {
				dirTest(dir, callback);
			});
		else
			callback();
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
 * Fetch the object asynchroniously. Similar to Array.prototype.forEach()
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
 * Link utils.for to the Object prototype
 */
Object.prototype.for = Array.prototype.for = function(callback)
{
	return utils.for(this, callback);
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
utils.settings = class
{
	constructor()
	{
		return new Promise(function(res, rej) {
			fs.readFile(path.join(__dirname, "settings.json"), function(e, data) {
				if(e && e.code !== "ENOENT")
					rej(e);
				else if(e)
				{
					this._settings = {
						"lang": "en"
					};
					this._dirty = true;
					this.save().then(() => res(this));
				}
				else
				{
					try {
						this._settings = JSON.parse(data);
						this._dirty = false;
						res(this);
					} catch(e) {
						rej(e);
					}
				}
			}.bind(this));
		}.bind(this));
	}
	get lang()
	{
		return this._settings.lang;
	}
	set lang(lang)
	{
		this._settings.lang = lang;
		this._dirty = true;
	}
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

		return translatable.for(function(itm, key, index) {
			let translate = this.translation(itm.getAttribute("trid"));
			if(translate instanceof Error)
				return Promise.reject(translate);
			itm.textContent = (typeof translate === "undefined" ? "unknown" : translate);
		}.bind(this));
	}
}
