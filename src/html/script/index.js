"use strict";
const {STATE} = require("../lib/Constants");

let text, buttonRetry, buttonOffline, state;

let mainLoader, mainLoadingbar, mainLoadingMax, mainLoadingState;
let secondaryLoader, secondaryLoadingbar, secondaryLoadingMax, secondaryLoadingState, secondaryDisplayed;

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
			mainLoader.classList.add("no-load");
			mainLoader.style.display = "";
			secondaryLoader.style.display = "none";
			buttonRetry.style.display = "";
			buttonOffline.style.display = "";
			secondaryDisplayed = false;
			break;

		case STATE.UPDATING_START:
			text.textContent = askTranslation(tr);
			if(state === STATE.UPDATING_START)
			{
				secondaryLoader.style.display = "";
				secondaryLoadingbar.style.width = "";
				secondaryLoadingMax = mainLoadingMax;
				mainLoadingMax = arg;
				secondaryLoadingState = 0;
				secondaryDisplayed = true;
			}
			else
			{
				mainLoader.classList.remove("no-load");
				mainLoadingbar.style.width = "";
				mainLoadingMax = arg;
				mainLoadingState = 0;
			}
			break;

		case STATE.UPDATING:
			mainLoadingState++;
			mainLoadingbar.style.width = (mainLoadingState / mainLoadingMax * 100) + "%";
			if(secondaryDisplayed && mainLoadingState === mainLoadingMax)
			{
				secondaryLoadingState++;
				secondaryLoadingbar.style.width = (secondaryLoadingState / secondaryLoadingMax * 100) + "%";
			}
			break;

		case STATE.LOADING:
			text.textContent = askTranslation("loading");
			mainLoadingbar.style.width = "";
			mainLoader.classList.add("no-load");
			secondaryDisplayed = false;
			break;

		case STATE.NOCONNECTION:
			text.textContent = askTranslation("no-connection");
			mainLoader.style.display = "none";
			buttonRetry.style.display = "block";
			buttonOffline.style.display = "block";
			secondaryDisplayed = false;
			break;

		case STATE.ERROR:
		default:
			text.textContent = askTranslation("error-updating");
			text.classList.add("error");
			mainLoader.style.display = "none";
			buttonRetry.style.display = "block";
			secondaryDisplayed = false;
			break;
	}
	state = s;
}

window.addEventListener("DOMContentLoaded", function() {
	text = document.getElementById("task-description");
	mainLoader = document.querySelector(".main-loading");
	mainLoadingbar = mainLoader.children[0];
	secondaryLoader = document.querySelector(".secondary-loading");
	secondaryLoadingbar = secondaryLoader.children[0];

	buttonRetry = document.querySelector(".retry");
	buttonOffline = document.querySelector(".offline");
});
ipcRenderer.on("updating", compute);