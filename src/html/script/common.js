const {ipcRenderer} = require("electron");

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
	return ipcRenderer.sendSync("translate", trid);
}
function askSetting(prop) //Synchronized
{
	return ipcRenderer.sendSync("settings", prop);
}
window.addEventListener('online', () => ipcRenderer.send("status", navigator.onLine));
window.addEventListener('offline', () => ipcRenderer.send("status", navigator.onLine));
window.addEventListener("DOMContentLoaded", function() {
	ipcRenderer.send("status", navigator.onLine);

	const translatable = document.querySelectorAll("[trid]");
	for(let node of translatable)
		node.textContent = askTranslation(node.getAttribute("trid"));
});