const http = require('http');
const https = require('https');
const path = require('path');
const url = require('url');
const fs = require('fs');

const VERSION = "2.0.0";
const debug = false;

/*
 * Everything you need to know:
 *	- This code is pure shit, I know it's not optimized at all, and a lot of things are illogic with the rest of the code. 
 *	- I learn a lot of things by making this software so I tried a lot and it's really messy, but it works.
 *	- Trid stands for Translation Id
 *	- Almost all of the code use asynchronism, so yes, there is a lot of functions in others functions in others functions
 *	- I tried to recode all the thcrap_configure algorithm in JS, but I don't understand all of them so maybe some are incorrect
 *	- I'M SO FUCKING LAZY ABOUT COMMENTING MY CODE T-T
 *	- The updator algorithm check the file size, so if you want to edit anything in the code, set debug to true to cancel updates
 */

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *															KNOWN BUGS														 *
 *																															 *
 *	- The preference is closed when the background patch loading is finished												 *
 *																															 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function downloadAndSave(dirpath, servers, url, _callback) //Download the file server + url and save it in dirpath + url. Handle both HTTP and HTTPS requests. If you give an array of server, the function will stop after the first code 200 response
{
	if(typeof _callback !== "function")
		return;
	var d = function(dirpath, url, _callback) //Internal function for downloading and saving data. Handle HTTP and HTTPS requests
	{
		console.log(url.toString());
		if(url.protocol == "https:")
		{
			https.get(url.toString(), function(res) {
				if(res.statusCode === 200)
				{
					dirTest(path.dirname(dirpath), function() {
						var write = fs.createWriteStream(dirpath); //We don't use httpHandleReuest because of this stream. Basic download using the httpHandleRequest don't respect png and others files encoding
						res.pipe(write);
						res.on("end", function() {
							_callback(null);
						});
						res.on("error", function(err) {
							_callback(err);
						});
					});
				}
				else
				{
					console.error("Not saved !");
					_callback(new Error("Error" + res.statusCode + ": " + res.statusMessage));
				}
			}).on("error", function(err) {
				_callback(err);
			});
		}
		else
		{
			http.get(url.toString(), function(res) {
				if(res.statusCode === 200)
				{
					dirTest(path.dirname(dirpath), function() {
						var write = fs.createWriteStream(dirpath);
						res.pipe(write);
						res.on("end", function() {
							_callback(null);
						});
						res.on("error", function(err) {
							_callback(err);
						});
					});
				}
				else
				{
					console.error("Not saved !");
					_callback(new Error("Error" + res.statusCode + ": " + res.statusMessage));
				}
			}).on("error", function(err) {
				_callback(err);
			});
		}
	}
	if(Array.isArray(servers))
		asyncFor(servers, function(i, resolve, reject) { 
			d(dirpath, new URL(servers[i] + "/" + url), function(e) {
				if(!e)
					return _callback(null);
			});
		}, function() {
			_callback(new Error("No server available"));
		});
	else
		d(dirpath, new URL(servers + "/" + url), _callback);
}

function httpHandleRequest(servers, file, parse, _callback) //Make a simple HTTP (or HTTPS) request. If you give an array of server, the function will stop after the first code 200 response
{
	if(typeof servers !== "string" && !Array.isArray(servers) || typeof file !== "string")
		return;
	var request = function(server, fn) {
		var url = new URL(server + file);
		console.log(url.toString());
		var pro = new Promise(function(resolve, reject) {
			if(url.protocol == "https:")
			{
				https.get(url.toString(), function(res) {
					let body = "";
					res.setEncoding("utf8");
					res.on("data", function(chunk) {
						body += chunk;
					});
					res.on("end", function() {
						if(parse)
						{
							try {
								resolve(JSON.parse(body));
							} catch(e) { reject(e); }
						}
						else
							resolve(body);
					});
				}).on("error", function(err) {
					reject(err);
				});
			}
			else if(url.protocol == "http:")
			{
				http.get(url.toString(), function(res) {
					let body = "";
					res.setEncoding("utf8");
					res.on("data", function(chunk) {
						body += chunk;
					});
					res.on("end", function() {
						if(parse)
						{
							try {
								resolve(JSON.parse(body));
							} catch(e) { reject(e); }
						}
						else
							resolve(body);
					});
				}).on("error", function(err) {
					reject(err);
				});
			}
		});
		pro.then(function(data) {
			if(typeof _callback === "function")
				fn(null, data);
		});
		pro.catch(function(err) {
			if(typeof _callback === "function")
				fn(err, null);
		});
	}
	if(Array.isArray(servers))
	{
		asyncFor(servers, function(i, resolve, reject) {
			request(servers[i], function(err, data) {
				if(err)
					resolve();
				else
					return _callback(err, data);
			});
		}, function() {
			var e = new Error();
			e.code = "ENOENT";
			return _callback(e, null);
		});
	}
	else
	{
		request(servers, function(err, data) {
			_callback(err, data);
		});
	}
}
function asyncFor(arr, func, _callback, _errorCallback) //Basic asynchrone for loop for arrays (updates when I won't be lazy: loop for objects, loop x time)
{
	if(arr.length === undefined || typeof func !== "function")
		return handleError(new Error("Undefined object used"));
	if(arr.length == 0)
		if(typeof _callback === "function")
			_callback();
		else
			return;
	(function loop(i) {
		var promise = new Promise(function(resolve, reject) {
			func(i, resolve, reject);
		});
		promise.then(function() {
			if(i !== arr.length - 1)
				loop(i + 1);
			else
			{
				if(typeof _callback === "function")
					_callback();
				else
					return;
			}
		});
		promise.catch(function(err) {
			if(err)
				handleError(err);
			if(typeof _errorCallback === "function")
				_errorCallback(err);
		});
	})(0);
}
function dirTest(dir, _callback) //Recursively create the necessary dir
{
	fs.mkdir(dir, function(err) {
		if(err && err.code !== "EEXIST" && err.code !== "ENOENT")
			handleError(err);
		else if(err && err.code === "ENOENT")
			dirTest(path.normalize(path.join(dir, "..")), function() {
				dirTest(dir, _callback);
			});
		else if(typeof _callback === "function")
			_callback();
	});
}
function httpFileSize(servers, url, _callback) //Get the HTTP header for the file length
{
	if(typeof servers !== "string" && !Array.isArray(servers) || typeof url !== "string")
		_callback(null);
	else
	{
		var fn = function(_url, _call)
		{
			var request = { 
				protocol: _url.protocol,
				hostname: _url.hostname,
				port: _url.protocol === "https:" ? 443 : 80,
				path: _url.pathname,
				method: 'HEAD'
			};
			console.log("Getting headers of " + _url.toString());
			if(_url.protocol == "https:")
			{
				https.request(request, function(res) {
					_call(res.headers['content-length']);
				}).on("error", function(err) {
					_call(null);
				}).end();
			}
			else if(_url.protocol == "http:")
			{
				http.request(request, function(res) {
					_call(res.headers['content-length']);
				}).on("error", function(err) {
					_call(null);
				}).end();
			}
		};
		if(typeof servers === "string")
			fn(new URL(servers + url), _callback);
		else
		{
			asyncFor(servers, function(i, resolve, reject) {
				fn(new URL(servers[i] + url), function(res) {
					if(res)
						return _callback(res)
					else
						resolve();
				});
			}, function() {
				_callback(new Error("No server available"));
			});
		}
	}
}