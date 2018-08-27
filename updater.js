const remote = require("electron").remote;
const updateServers = ["https://aspect-code.net/touhouproject/download/thcrap_gui/"];

let win;

function versionUp(lastVersion)
{
	if(lastVersion === VERSION)
		return false;
	var lastVExploded = lastVersion.split(".");
	var actualVExploded = VERSION.split(".");
	for(i in actualVExploded)
	{
		if(parseInt(actualVExploded[i]) > parseInt(lastVExploded[i]))
			return false;
		else if(parseInt(actualVExploded[i]) < parseInt(lastVExploded[i]))
			return true;
	}
}
function createAppWindow()
{
    win = new remote.BrowserWindow({frame: false, minWidth: 940, minHeight: 600, height: 700, width: 1040, fullscreenable: false});
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'app.html'),
        protocol: 'file:',
        slashes: true
    }));

	remote.getCurrentWindow().close();

    win.on('closed', () => { win = null; });
}
function runInstallScript(_callback)
{
	try {
		var s = require("./install_script");
		s.installScript(function() {
			fs.unlink(path.join(__dirname, "install_script.js"), function(e) {
				_callback();
			});
		});
	} catch(e) { _callback(); }
}
function integrityCheck(data, _callback)
{
	var arr = [];
	asyncFor(Object.keys(data), function(a, resolve, reject) {
		a = Object.keys(data)[a];
		if(versionUp(a) || a == VERSION)
			asyncFor(data[a], function(j, _resolve, _reject) {
				if(!arr.find(function(e) { return data[a][j] === e.substr(6); }) && data[a][j] != undefined)
				{
					if(a == VERSION)
						fs.lstat(path.join(__dirname, data[a][j]), function(e, s) {
							if(e && e.code === "ENOENT" && data[a][j] != "install_script.js")
							{
								arr.push(a + '/' + data[a][j]);
								_resolve();
							}
							else if(!e)
							{
								httpFileSize(updateServers, a + "/" + data[a][j], function(r) {
									console.log("Client side : " + s.size + ", server side : " + r);
									if(!r || r != s.size)
										arr.push(a + '/' + data[a][j]);
									_resolve();
								});
							}
							else
								_resolve()
						});
					else
					{
						arr.push(a + '/' + data[a][j]);
						_resolve();
					}
				}
				else
					_resolve();
			}, function() {
				resolve();
			});
		else
			resolve();
	}, function() {
		_callback(arr);
	});
}

runInstallScript(function() {
	httpHandleRequest(updateServers, "version.json", true, function(err, data) {
		if(err && err.code == "ENOENT")
			createAppWindow();
		else if(err)
		{
			remote.dialog.showErrorBox("Touhou Community Reliant Automatic Patcher", "An error occured while trying to load the software, please try again or contact the dev team on https://www.thpatch.net");
			return app.quit();
		}
		else
		{
			integrityCheck(data, function(unique) {
				if(unique.length !== 0 & !debug)
				{
					var p = document.querySelector(".progress");
					p.classList.toggle("hidden");
					p.classList.toggle("shown");
					p.setAttribute("max", unique.length);
					p.setAttribute("size", 0);

					asyncFor(unique, function(i, resolve, reject) {
							downloadAndSave(path.join(__dirname, unique[i].substr(6)), updateServers, unique[i], function(err) {
								if(err)
								{
									remote.dialog.showErrorBox("Touhou Community Reliant Automatic Patcher", "An error occured while trying to load the software, please try again or contact the dev team on https://www.thpatch.net");
									return app.quit();
								}
								else
								{
									p.setAttribute("size", parseInt(p.getAttribute("size")) + 1);
									p.style.width = p.getAttribute("size") / p.getAttribute("max") + "%";
									resolve();
								}
							});
					}, function() {
							remote.getCurrentWindow().reload();
					});
				}
				else
					return createAppWindow();
			});
		}
	});
});