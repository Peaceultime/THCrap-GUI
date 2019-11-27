/**
 * @description Every functions must be commented to ensure full understanding of the software.
 * Note that a resolved promise can only have one argument, so if you want to return more arguments,
 * you must return an object.
 */
"use strict";
const utils = {};
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const URL = require('url');
const crypto = require("crypto");
const {performance} = require("perf_hooks");
const Constant = require("./Constants");

utils.required = {
	path: path,
	http: http,
	https: https,
	fs: fs,
	URL: URL,
	crypto: crypto,
	performance: performance
};

/**
 * Promisified version of writeFile
 * Create dir if missing
 */
utils.save = function save(file, data)
{
	return new Promise(function(res, rej) {
		utils.rmkdir(path.dirname(file), function() {
			fs.writeFile(file, data, function(e) {
				if(e)
					rej(e);
				else
					res();
			})
		})
	});
};
/**
 * Promisified version of readFile
 */
utils.read = function(file)
{
	return new Promise(function(res, rej) {
		fs.readFile(file, function(e, data) {
			if(e)
				rej(e);
			else
				res(data);
		})
	});
};
/**
 * Promisified version of readdir
 */
utils.readdir = function(dir)
{
	return new Promise(function(res, rej) {
		fs.readdir(dir, function(e, files) {
			if(e)
				rej(e);
			else
				res(files);
		})
	});
};
/**
 * Promisified version of lstat
 */
utils.lstat = function(path)
{
	return new Promise(function(res, rej) {
		fs.lstat(path, function(e, stat) {
			if(e)
				rej(e);
			else
				res(stat);
		});
	});
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
			if(Constant.DEBUG && !err)
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
 *         @param {IncomingMessage} IncomingMessage object coming from the server
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

	if(Constant.DEBUG)
		console.log("Requesting %s using '%s' method", url.format(), request.method);

	return new Promise(function(res, rej)
	{
		if(url.protocol == "https:")
		{
			https.request(request, function(resp) {
				if(resp.statusCode > 300 && resp.statusCode < 400 && resp.headers.location)
				{
					if(Constant.DEBUG)
						console.log("HTTPS Code " + resp.statusCode + ": Redirection");
					utils.request(resp.headers.location, method).then(res).catch(rej);
				}
				else
					res(resp);
			}).on("error", function(e) {
				rej(e);
			}).end();
		}
		else if(url.protocol == "http:")
		{
			http.request(request, function(resp) {
				if (resp.statusCode > 300 && resp.statusCode < 400 && resp.headers.location)
				{
					if(Constant.DEBUG)
						console.log("HTTP Code " + resp.statusCode + ": Redirection");
					utils.request(resp.headers.location, method).then(res).catch(rej);
				}
				else
					res(resp);
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
	let time;
	if(Constant.TIMING)
		time = performance.now();

	if(typeof url !== "string" || typeof dest !== "string")
		return Promise.reject();

	return new Promise(function(res, rej) {
		utils.request(url).then(function(then) {
			if(then.statusCode >= 400)
				rej(new Error("Error " + then.statusCode + (then.statusMessage ? (": " + then.statusMessage) : "")));
			else
				utils.rmkdir(path.dirname(dest), function(e) {
					if(e)
						rej(e);
					else
					{
						if(Constant.DEBUG && !Constant.TIMING)
							console.log("Starting to save " + url + " in " + (path.isAbsolute(dest) ? dest : path.join(process.cwd(), dest)));

						let write = fs.createWriteStream(dest), body = "";
						then.pipe(write);

						then.on("data", function(data) {
							body += data;
						});
						then.on("end", function() {
							if(Constant.TIMING)
								console.log("It took %s ms to save %s", performance.now() - time, url);
							res(body);
						}).on("error", function(e) {
							console.error(e);
							rej(e);
						});
					}
				});
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
		return Promise.resolve({"size": then.headers["content-length"]});
	});
};
/**
 * Get all the data from the given URL
 * @param  {string}  url     Fetched URL
 * @return {Promise}         Promise resolved when the download is finished
 */
utils.get = function(url)
{
	let body = "";
	return new Promise(function(res, rej) {
		utils.request(url).then(function(then) {
			if(Constant.DEBUG)
				console.log("Start getting data");

			then.setEncoding("utf8");
			then.on("data", function(data) {
				body += data;
			});
			then.on("end", function() {
				res(body);
			});
			then.on("error", function(e) {
				rej(e);
			});
		});
	});
};
/**
 * Fetch the object asynchroniously. Similar to Array.prototype.forEach(), but asynchrone.
 * Watch out ! Updating the iterated object won't change the iteration.
 * @param  {Object|Array|Map} object Fetch object, can be an object or an array
 * @param  {Function} callback       Function called at each iteration. This is the fetched object
 *         @param {Any} item		    Item in the actual iteration
 *         @param {Any} key 		    Key of the iteration
 *         @param {int} index 		    Index of the iteration
 * @param  {any} thisArg             Bind this argument with the callback
 * @param  {Boolean} stop		     Stop the loop when catching an error
 * @return {Promise}                 Promise resolved when the fetching is over
 */
utils.for = function(object, callback, thisArg, stop = true)
{
	if(typeof object !== "object")
		return Promise.reject(new TypeError("object must be <Object>, <Map> or <Array>"));
	if(typeof callback !== "function")
		return Promise.reject(new TypeError("callback must be <Function> (GeneratorFunction are not handle)"));

	let values = Object.values(object);
	if(object.values && values.length === 0)
		values = [...object.values()];
	let keys = Object.keys(object);
	if(object.keys && keys.length === 0)
		keys = [...object.keys()];
	let index = 0;

	if(values.length !== keys.length)
		return Promise.reject(new Error("Keys and values don't have the same length"));

	thisArg = thisArg || object;

	if(Constant.DEBUG)
		console.log("Iterating through ", object);

	let loop = function()
	{
		if(Constant.DEBUG)
			console.log("Iteration " + index);

		if(index == keys.length)
			return Promise.resolve();

		const result = callback.call(thisArg, values[index], keys[index], index);
		if(result && result.then && stop)
			return result.then(function() { index++; return loop(); });
		else if(result && result.finally && !stop)
			return result.finally(function() { index++; return loop(); });
		else
		{
			index++;
			return loop();
		}
	};
	return loop();
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
utils.nodes = {
	node(type, classList, text)
	{
		const node = document.createElement(type);
		if(!Array.isArray(classList))
			classList = [classList];
		for(const className of classList)
			node.classList.add(className);
		if(text && text !== "")
			node.textContent = text;
		return node;
	},
	div(classList, text)
	{
		return utils.nodes.node("div", classList, text);
	},
	span(classList, text)
	{
		return utils.nodes.node("span", classList, text);
	},
	input(type, classList, value = "")
	{
		const node = utils.nodes.node("input", classList);
		node.type = type;
		node.value = value;
		return node;
	},
	children(node, children)
	{
		if(!Array.isArray(children))
			children = [children];
		for(const child of children)
			node.appendChild(child);
		return node;
	},
	nochild(node)
	{
		const children = node.children, length = children.length;
		for(let i = length - 1; i > 0; i--)
			node.removeChild(children.item(i));
		return node;
	}
};

/**
 * Try to download a given list of files from several servers
 * @param  {Array<string>} srvlist 					List of fetched servers
 * @param  {Array<string>} files 					List of files to download
 * @param  {string} dir 							Where are saved all the files
 * @param  {Function<string, string, int>} progress	Function executed after each download, with the data as the first argument, the file name as the second and the iteration as the third
 * @return {Promise<Array<string>>} 				Return the list of the failed downloads
 */
utils.batch = function(srvlist, files, dir, progress)
{
	const failed = [];

	if(srvlist.length === 0 || files.length === 0)
		return Promise.resolve();

	let cache;
	return utils.for(files, function(file, idx, i) {
		let downloaded = false;
		if(!cache)
			return utils.for(srvlist, function(srv) {
				if(downloaded)
					return;

				return utils.download(srv + file, path.join(dir, file)).then(function(data) {
					if(!cache)
						cache = srv;
					downloaded = true;
					if(progress)
						return progress(data, file, i);
				});
			}, undefined, false).catch(function(e) {
				if(Constants.DEBUG)
				{
					console.log("Failed to download %s", file);
					console.error(e);
				}
				failed.push(file);
			});
		else
			return utils.download(cache + file, path.join(dir, file)).then(function(data) {
				if(progress)
					return progress(data, file, i);
			}).catch(function(e) {
				if(Constants.DEBUG)
				{
					console.log("Failed to download %s", file);
					console.error(e);
				}
				failed.push(file);
			});
	}, undefined, false).finally(function() {
		return Promise.resolve(failed);
	});
};

Object.assign(exports, utils);
