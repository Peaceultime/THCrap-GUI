"use strict";

const {app, BrowserWindow, remote, shell, ipcMain} = require('electron');

const path = require('path');
const url = require('url');
const Settings = require("./lib/backend/Settings");
const Translation = require("./lib/backend/Translation");
const PatchManager = require("./lib/backend/PatchManager");
const ProfileManager = require("./lib/backend/ProfileManager");
const GameManager = require("./lib/backend/GameManager");
const Utils = require("./lib/Utils");
const Updater = require('./lib/Updater');
const App = require('./lib/App');
const Constants = require('./lib/Constants');

let win, isUpdated;

function createWindow()
{
	if(process.argv.includes("--updated"))
		isUpdated = true;

	Settings.load().then(function() {
		return Translation.load(Settings.get("lang"));
	}).then(function() {
		win = App.launch(Utils.required.path.join('src', 'html', 'index.html'), {
			show: false, 
			frame: false, 
			height: 303, 
			width: 370, 
			fullscreenable: false, 
			resizable: false,
			webPreferences: {
				nodeIntegration: true,
				nodeIntegrationInWorker: true,
				enableRemoteModule: false,
				disableHtmlFullscreenWindowResize: true
			}
		});

		win.webContents.once("dom-ready", update);

		ipcMain.on("translate", function(e, args) {
			e.returnValue = Translation.translate(args);
		});
		ipcMain.on("settings", function(e, prop, value) {
			if(value !== undefined)
				Settings.set(prop, value);
			else
				e.returnValue = Settings.get(prop);
		});
	});

	ipcMain.on("menu", function(e, args) {
		if(args === "exit")
			win.close();
		else if(args === "minimize")
			win.minimize();
		else if(args === "resize")
		{
			if(win.isMaximized())
				win.unmaximize();
			else
				win.maximize();
		}
		else if(args === "tool")
			win.toggleDevTools();
	});
	ipcMain.on("status", function(e, status) {
		Updater.setConnectionStatus(status);
	});
	ipcMain.on("updater", function(e, request) {
		switch(request)
		{
			case "retry":
				update();
				break;

			case "offline":
				load();
				break;

			default:
				break;
		}
	});
}

function update()
{
	if(Updater.connection())
	{
		Updater.update(win.webContents).then(function() {
			load();
		}, function() {
			app.relaunch({ args: process.argv.slice(1).concat(['--updated']) });
			app.exit(0);
		})
	}
	else
		win.webContents.send("updating", Constants.STATE.NOCONNECTION);
}

function load()
{
	PatchManager.load().then(function() {
		return Promise.all([GameManager.load(),
		ProfileManager.load()]);
	}, console.error).then(function() {
		ipcMain.removeAllListeners("updater");
		win = App.launch(Utils.required.path.join("src", "html", "app.html"), {
			show: false,
			frame: false,
			minHeight: 600,
			minWidth: 800,
			fullscreenable: false,
			webPreferences: {
				nodeIntegration: true,
				enableRemoteModule: false,
				disableHtmlFullscreenWindowResize: true
			}
		});
	}, console.error);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin')
		app.quit();
});

app.on('activate', () => {
	if (win === null)
		createWindow();
});