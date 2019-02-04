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
	settings = new utils.settings();
	translation = new utils.translation(settings.lang);
	translation.translate();
});
//window.addEventListener("load", update);