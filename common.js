const remote = require('electron').remote;
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const URL = require('url');

var win = remote.getCurrentWindow();
const debug = true;
const verbose = true;

var utils = {};
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
}
utils.request = function(url, method)
{
	if(typeof url !== "string")
		return Promise.reject(new Error("Unvalid URL type, must be string"));

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
				res(resp);
			}).on("error", function(e) {
				rej(e);
			}).end();
		}
		else if(url.protocol == "http:")
		{
			http.request(request, function(resp) {
				res(resp);
			}).on("error", function(e) {
				rej(e)
			}).end();
		}
	});
};
utils.download = function(url, dest)
{
	if(typeof url !== "string" || typeof dest !== "string")
		return Promise.reject();

	return new Promise(function(res, rej) {
		utils.request(url).then(function(resp) {
			utils.rmkdir(path.dirname(dest), function(e) {
				if(e)
					rej(e);
				else
				{
					if(verbose)
						console.log("Starting to save " + url + " in " + (path.isAbsolute(dest) ? dest : path.join(__dirname, dest)));

					let write = fs.createWriteStream(dest);
					resp.pipe(write);
					resp.on("end", function() {
						res();
					}).on("error", function(e) {
						rej(e);
					});
				}
			})
		}).catch(rej);
	});
};
utils.sizeof = function(url)
{
	return utils.request(url, "HEAD").then(function(res) {
		return Promise.resolve(res.headers["content-length"]);
	});
};
utils.get = function(url)
{
	let body = "";
	return new Promise(function(res, rej) {
		utils.request(url).then(function(resp) {
			resp.setEncoding("utf8");
			resp.on("data", function(data) {
				body += data;
			});
			resp.on("end", function() {
				res(body);
			});
			resp.on("error", function(e) {
				rej(e);
			});
		});
	});
};
