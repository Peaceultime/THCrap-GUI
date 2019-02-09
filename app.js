"use strict";

const { shell } = require("electron");

let patches, profiles, games;

window.addEventListener("DOMContentLoaded", function() {
	new utils.settings().then(function(set) {
		settings = set;
		new utils.translation(settings.get("lang")).then(function(trsl) {
			translation = trsl;
			translation.translate().catch(function(e) {
				console.error(e);
			});
		});
		new utils.patches().then(function(data) {
			patches = data;
		});
	});
	new utils.profiles().then(function(data) {
		profiles = data;
	});
});

window.addEventListener("load", function() {
	let tabs = document.querySelectorAll(".app-tabs .tab");
	let tabContainers = document.querySelectorAll(".tab-container");

	for(let i of tabs)
	{
		i.addEventListener("click", function(e) {
			let attr = this.getAttribute("action-tab");
			for(let i of tabContainers)
			{
				if(i.getAttribute("tab") != attr)
					i.classList.add("tab-hidden");
				else
					i.classList.remove("tab-hidden");
			}
			for(let i of tabs)
				i.classList.remove("active");
			this.classList.add("active");
		});
	}

	document.querySelector(".close-app").addEventListener("click", function() {
		win.close();
	});
	document.querySelector(".maximaze-app").addEventListener("click", function(){
		if(win.isMaximized())
			win.unmaximize();
		else
			win.maximize();
	});
	document.querySelector(".minimize-app").addEventListener("click", function() {
		win.minimize();
	});
	document.querySelector(".settings").addEventListener("click", function() {
		win.toggleDevTools();
	});
});
