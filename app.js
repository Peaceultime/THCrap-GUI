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

			new utils.games().then(function(data) {
				games = data;
			});
		});
		new utils.patches().then(function(data) {
			patches = data;
			patches._patchListDOM.classList.remove("loading");
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
			if(verbose)
				console.log("Switching to tab " + this.textContent);

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

	document.querySelector(".vanilla-button").addEventListener("click", function() {
		games.launch(this.gameId, true).then(function() {
			this.textContent = translation.translation(this.getAttribute('trid'))
		}.bind(this)).catch(function(e) {
			console.error(e);
			this.textContent = e;
			setTimeout(function() {
				this.textContent = translation.translation(this.getAttribute('trid'))
			}.bind(this), 5000);
		}.bind(this));
		this.textContent = translation.translation('game-launched');
	});

	document.querySelector(".patched-button").addEventListener("click", function() {
		games.launch(this.gameId, false).then(function() {
			this.textContent = translation.translation(this.getAttribute('trid'))
		}.bind(this)).catch(function(e) {
			console.error(e);
			this.textContent = e;
			setTimeout(function() {
				this.textContent = translation.translation(this.getAttribute('trid'))
			}.bind(this), 5000);
		}.bind(this));
		this.textContent = translation.translation('game-launched');
	});

	for(let i of document.querySelectorAll(".more-button"))
		i.addEventListener("click", function() {
			let node = this.parentNode.querySelector(".more-wrapper");
			if(node)
				node.classList.toggle("toggled");
		});

	for(let i of document.querySelectorAll(".more-wrapper > button"))
		i.addEventListener("click", function() {
			this.parentNode.classList.remove("toggled");
		});

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
