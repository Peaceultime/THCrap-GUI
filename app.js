"use strict";

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

	document.querySelector(".close-window").addEventListener("click", win.close);
	document.querySelector(".maximize-window").addEventListener("click", function(){
		if(win.isMaximized())
			win.unmaximize();
		else
			win.maximize();
	});
	document.querySelector(".minimize-window").addEventListener("click", win.minimize);
	document.querySelector(".settings").addEventListener("click", win.close);
});