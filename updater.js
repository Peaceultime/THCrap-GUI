"use strict";

/**
 * Close the window
 */
function closeWindow()
{
	remote.getCurrentWindow().close();
}
/**
 * Start searching for updates
 */
function update()
{

}

window.addEventListener("DOMContentLoaded", function() {
	new utils.settings().then(function(set) {
		settings = set;
		new utils.translation(settings.get("lang")).then(function(trsl) {
			translation = trsl;
			translation.translate().catch(function(e) {
				console.error(e);
			});
		});
	});
});
//window.addEventListener("load", update);
