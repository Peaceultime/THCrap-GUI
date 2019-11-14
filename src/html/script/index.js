"use strict";
const {STATE} = require("../lib/Constants");

let text, loader, loadingbar, loadingMax, loadingState, buttonRetry, buttonOffline, state;

function retry()
{
	if(state === STATE.NOCONNECTION || state === STATE.ERROR)
		ipcRenderer.send("updater", "retry");
}
function offline()
{
	if(state === STATE.NOCONNECTION)
		ipcRenderer.send("updater", "offline");
}
function compute(e, s, arg, tr)
{
	switch(s)
	{
		case STATE.SEARCHING:
			text.textContent = askTranslation("update-search");
			loader.classList.add("no-load");
			loader.style.display = "";
			buttonRetry.style.display = "";
			buttonOffline.style.display = "";
			break;

		case STATE.UPDATING_START:
			text.textContent = askTranslation(tr);
			loader.classList.remove("no-load");
			loadingbar.style.width = "";
			loadingMax = arg;
			loadingState = 0;
			break;

		case STATE.UPDATING:
			loadingState++;
			console.log((loadingState / loadingMax * 100));
			loadingbar.style.width = (loadingState / loadingMax * 100) + "%";
			break;

		case STATE.LOADING:
			text.textContent = askTranslation("loading");
			loadingbar.style.width = "";
			loader.classList.add("no-load");
			break;

		case STATE.NOCONNECTION:
			text.textContent = askTranslation("no-connection");
			loader.style.display = "none";
			buttonRetry.style.display = "block";
			buttonOffline.style.display = "block";
			break;

		case STATE.ERROR:
		default:
			text.textContent = askTranslation("error-updating");
			text.classList.add("error");
			loader.style.display = "none";
			buttonRetry.style.display = "block";
			break;
	}
	state = s;
}

window.addEventListener("DOMContentLoaded", function() {
	text = document.getElementById("task-description");
	loader = document.getElementById("loading");
	loadingbar = loader.children[0];

	buttonRetry = document.querySelector(".retry");
	buttonOffline = document.querySelector(".offline");
});
ipcRenderer.on("updating", compute);