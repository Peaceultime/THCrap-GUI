const {ipcRenderer} = require("electron");

let connection = false;

function exit()
{
	ipcRenderer.send("menu", "exit");
}
function resize()
{
	ipcRenderer.send("menu", "resize");
}
function minimize()
{
	ipcRenderer.send("menu", "minimize");
}
function tools()
{
	ipcRenderer.send("menu", "tool");
}
function askTranslation(trid) //Synchronized
{
	return ipcRenderer.sendSync("translate", "translate", trid);
}
function askSetting(prop) //Synchronized
{
	return ipcRenderer.sendSync("settings", prop);
}
function translateAll()
{
	const translatable = document.querySelectorAll("[trid]");
	for(let node of translatable)
		node.textContent = askTranslation(node.getAttribute("trid"));
}

ipcRenderer.on("connection", status => {connection = status});

window.addEventListener("DOMContentLoaded", translateAll);