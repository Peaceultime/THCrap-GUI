const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const child_process = require("child_process");

function save(file, data)
{
	return new Promise(function(res, rej) {
		fs.writeFile(file, data, function(e) {
			if(e)
				rej(e);
			else
				res();
		});
	});
};
function read(file)
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
function readdir(dir)
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
function unlink(file)
{
	return new Promise(function(res, rej) {
		fs.unlink(file, function(e) {
			if(e)
				rej(e);
			else
				res();
		})
	});
};
function lstat(file)
{
	return new Promise(function(res, rej) {
		fs.lstat(file, function(e, stat) {
			if(e)
				rej(e);
			else
				res(stat);
		});
	});
};
async function rmdir(dir)
{
	const promised = function() {
		return new Promise(function(res, rej) {
			fs.rmdir(dir, function(e) {
				if(e)
					rej(e);
				else
					res();
			})
		});
	};

	const files = await readdir(dir);
	if(files.length === 0)
		await promised(dir);
	else
	{
		for(let file of files)
		{
			file = path.join(dir, file);
			const stat = await lstat(file)
			if(stat.isDirectory())
				await rmdir(file);
			else if(stat.isFile())
				await unlink(file);
		}
		await promised(dir);
	}
};
function mkdir(dir)
{
	return new Promise(function(res, rej) {
		fs.mkdir(dir, function(e) {
			if(e)
				rej(e);
			else
				res();
		})
	});
};
function sha(file)
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
};

async function process(dir)
{
	const list = [];
	const loop = async function(file) {
		try {
			const files = await readdir(file);
			for(let f of files)
			{
				if(f === "thcrap")
					continue;
				f = path.join(file, f)
				const stat = await lstat(f);
				if(stat.isDirectory())
					await loop(f);
				else
					list.push(f);
			}
		} catch(e) { console.error(e); }
	};

	await loop(dir);

	return list;
}
async function version(list)
{
	console.log(list);
	const obj = {};
	for(const file of list)
		obj[file] = await sha(file);

	await save("version.js", JSON.stringify(obj));
}
async function build()
{

}
async function deploy()
{
	console.log("Start");

	const list = await process("src");
	await version(list);

	try { await unlink("data/profiles.json"); } catch(e) { console.error(e); }
	try { await unlink("data/settings.json"); } catch(e) { console.error(e); }
	try { await unlink("data/games.json"); } catch(e) { console.error(e); }

	try { await rmdir("src/thcrap/repos"); } catch(e) { console.error(e); }
	try { await mkdir("src/thcrap/repos"); } catch(e) { console.error(e); }

	const child = child_process.exec("npx electron-forge make");
	child.stdout.on("data", console.log);
	child.stderr.on("data", console.error);

	console.log("End");
}

deploy();
