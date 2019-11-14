const Constants = require("../lib/Constants");
const Game = require("../lib/frontend/Game");
const Patch = require("../lib/frontend/Patch");
const Repo = require("../lib/frontend/Repo");
const Profile = require("../lib/frontend/Profile");
const ContextMenu = require("../lib/frontend/ContextMenu");
const SidePopup = require("../lib/frontend/SidePopup");
const PatchListPopup = require("../lib/frontend/PatchListPopup");
const ProfilePopup = require("../lib/frontend/ProfilePopup");
const RenamePopup = require("../lib/frontend/RenamePopup");

const gameList = new Map();
let searchButton, downloadPopup, downloadedPatch;

/**
 * Can't release without all these components
 * @todo PatchListPopup in edit mode [Priority 8]
 * @todo Determine settings UI [Priority 8]
 * @todo Settings Popup [Priority 7]
 * @todo Fix patch loading [Priority max]
 * @todo Updater [Priority 8]
 *
 * Would be better to release with these components
 * @todo Tutorial [Priority 6]
 * @todo TutorialPopup [Priority 6]
 * @todo Handle no connection [Priority 4]
 * @todo Cache translations and settings in frontend [Priority 3]
 * @todo Error logging for download and things like that [Priority 2]
 */

function profiles()
{
	popup = new ProfilePopup();
	popup.show();
}
function patches()
{
	popup = new PatchListPopup();
	popup.show();
}
function search()
{
	ipcRenderer.send("game", "search");
}
function gameBinding(e, request, args)
{
	if(request === "update")
	{
		for(const game in args)
		{
			if(!args.hasOwnProperty(game) || game.endsWith("_custom"))
				continue;
			gameList.get(game).update(args[game], args[game + "_custom"]);
		}
	}
	else if(request === "search")
	{
		if(args.start)
			searchButton.classList.add("load");
		else if(args.found)
		{
			const custom = args.found.endsWith("_custom");
			gameList.get(args.found.replace("_custom", "")).update(!custom ? true : undefined, custom ? true : undefined);
			const text = Constants.GAME_DATA[args.found.replace("_custom", "")].title + (args.found.endsWith("_custom") ? (" " + askTranslation("game-config")) : "");
			new SidePopup(askTranslation("found-game").replace("%s", text));
		}
		else if(args.error)
			console.log(args.error);
		else if(args.end)
			searchButton.classList.remove("load");
	}
	else if(request === "end")
		Game.launched = false;
}
function profileBinding(e, request, args)
{
	if(request === "update")
	{
		for(const name in args)
		{
			if(!args.hasOwnProperty(name))
				continue;
			new Profile(name, args[name]);
		}
		Profile.selectDefault();
	}
}
function patchBinding(e, request, args)
{
	console.log(request, args);
	if(request === "update")
	{
		for(const fullId in args)
		{
			if(!args.hasOwnProperty(fullId))
				continue;
			const patch = new Patch(fullId, args[fullId]);
			if(!Repo.has(patch.repo))
				new Repo(patch.repo);
			Repo.get(patch.repo).add(patch);
		}
	}
	else if(request === "download")
	{
		downloadPopup.update(askTranslation("download-patch").replace("%s", downloadedPatch.fullId).replace("%s", args.file), 1);
	}
	else if(request === "startdownload")
	{
		downloadedPatch = Patch.get(args.patch);
		if(args.length !== 0)
			downloadPopup = new SidePopup(askTranslation("download-patch").replace("%s", downloadedPatch.fullId).replace("%s", args.file), {loading: args.length - 1});
	}
}

window.addEventListener("DOMContentLoaded", function() {
	document.appBody = document.querySelector(".app-wrapper");
	const gameNode = document.querySelector(".game-list");
	searchButton = document.querySelector(".search-button");

	for(const game of gameList.values())
		gameNode.append(game.node);

	ContextMenu.load();
	SidePopup.load();
});

for(const id in Constants.GAME_DATA)
{
	const game = new Game(id);
	gameList.set(id, game);
}

ipcRenderer.on("game", gameBinding);
ipcRenderer.on("patch", patchBinding);
ipcRenderer.on("profile", profileBinding);

ipcRenderer.send("profile", "ask");
ipcRenderer.send("patch", "ask");
ipcRenderer.send("game", "ask");
