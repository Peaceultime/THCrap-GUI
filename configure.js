const remote = require('electron').remote;
window.$ = window.jQuery = require('./jquery.min.js');
const crypto = require('crypto');
const os = require('os');

const defaultSettings = {
	lang: "en", //Everything is in the name
	games: { //Game file location
		"06": null, "07": null, "08": null, "09": null, "10": null, "11": null, "12": null, "13": null, "14": null, "15": null, "16": null,
		"075": null, "095": null, "105": null, "123": null, "125": null, "128": null, "135": null, "143": null, "145": null, "155": null,
		"megamari": null, "nsml": null, "alcostg": null, "165": null
	}, custom: { //Config file location
		"06": null, "07": null, "08": null, "09": null, "10": null, "11": null, "12": null, "13": null, "14": null, "15": null, "16": null,
		"075": null, "095": null, "105": null, "123": null, "125": null, "128": null, "135": null, "143": null, "145": null, "155": null,
		"megamari": null, "nsml": null, "alcostg": null, "165": null
	}, first_repo: "http://thcrap.nmlgc.net/repos/nmlgc/",
	updates: { //Updating in the background ?
		patchs: false,
		games: false
	}
};

const gamesNames = {
	"06": {"jp": "東方紅魔郷", "en": "Embodiment of Scarlet Devil", "infos": null}, "07": {"jp": "東方妖々夢", "en": "Perfect Cherry Blossom", "infos": null},
	"08": {"jp": "東方永夜抄", "en": "Imperishable Night", "infos": null}, "09": {"jp": "東方花映塚", "en": "Phantasmagoria of Flower View", "infos": null},
	"10": {"jp": "東方風神録", "en": "Mountain of Faith", "infos": null}, "11": {"jp": "東方地霊殿", "en": "Subterranean Animism", "infos": null},
	"12": {"jp": "東方星蓮船", "en": "Undefined Fantastic Object", "infos": null}, "13": {"jp": "東方神霊廟", "en": "Ten Desires", "infos": null},
	"14": {"jp": "東方輝針城", "en": "Double Dealing Character", "infos": null}, "15": {"jp": "東方紺珠伝", "en": "Legacy of Lunatic Kingdom", "infos": null},
	"16": {"jp": "東方天空璋", "en": "Hidden Star in Four Seasons", "infos": null}, "075": {"jp": "東方萃夢想", "en": "Immaterial and Missing Power", "infos": "not-available-yet"},
	"095": {"jp": "東方文花帖", "en": "Shoot the Bullet", "infos": null}, "105": {"jp": "東方緋想天", "en": "Scarlet Weather Rhapsody", "infos": null},
	"123": {"jp": "東方非想天則", "en": "Unthinkable Natural Law", "infos": null}, "125": {"jp": "東方文花帖", "en": "Double Spoiler", "infos": null},
	"128": {"jp": "妖精大戦争", "en": "The Great Fairy Wars", "infos": null}, "135": {"jp": "東方心綺楼", "en": "Hopeless Masquerade", "infos": null},
	"143": {"jp": "弾幕アマノジャク", "en": "Impossible Spell Card", "infos": null}, "145": {"jp": "東方深秘録", "en": "Urban Legend in Limbo", "infos": null},
	"155": {"jp": "東方憑依華", "en": "Antinomy of Common Flowers", "infos": null}, "megamari": {"jp": "魔理沙の野望", "en": "Megamari", "infos": null},
	"nsml": {"jp": "魔理沙と6つのキノコ", "en": "New Super Marisa Land", "infos": null}, "alcostg": {"jp": "黄昏酒場", "en": "Uwabami Breakers", "infos": null}, 
	"165": {"jp": "秘封ナイトメアダイアリー", "en": "Violet Detector", "infos": null}
}; //Games constants

var settings = {}, //Global object for settings
global_vars = {}, //Global variables objects
gameLaunched = false, //Is a game launched
jstranslate; //Variable for translation transcription

$(document).ready(function(){ //Setup all the actions for icons
	remote.getCurrentWebContents().on("devtools-closed", function() { 
		$(".settings.drag-zone-action").removeClass("settings-on");
	});
	remote.getCurrentWebContents().on("devtools-opened", function() {
		$(".settings.drag-zone-action").addClass("settings-on");
	});
	$(".close-window").click(function(){
		remote.getCurrentWindow().close();
	});
	$(".minimize-window").click(function(){
		remote.getCurrentWindow().minimize();
	});
	$(".maximaze-window").click(function(){
		if(remote.getCurrentWindow().isMaximized())
			remote.getCurrentWindow().unmaximize();
		else
			remote.getCurrentWindow().maximize();
	});
	fs.readFile(path.join(__dirname, "translation_files", "lang_en.json"), 'utf8', function(err, data) {
		if(err)
			handleError(err);
		else
			try {
				jstranslate = JSON.parse(data);
				start();
			} catch(e) { handleError(e); }
	});
});
function start() //Basic startup
{
	f= function() //Load default settings and prompt the first launch popup, then load the tutorial
	{
		fs.writeFile('settings.json', JSON.stringify(defaultSettings), 'utf8', function(err) { //Save default settings
			if(err)
				handleError(err);
		});
		settings = defaultSettings;
		appendPopup("settings-tab-setting", true, function(e) { //Append the first launch popup
			$(".close-popup").remove();
			settingsSetup(e);
			e.append("<button class='button setup-button' trid='popup-confirm'>" + individualTranslate("popup-confirm") + "</div>");
			$(".setup-button").on("click", function() { //When the settings is finished
				$('.popup-background').remove();
				loadTutorial(false); //Load the tutorial
			});
		});
	}
	fs.readFile("settings.json", function(e, data) { //Get settings.json
		if(e) //If there is a error
			if(e.code == "ENOENT") //If the file doesn't exists
			{
				f();
			}
			else
				handleError(e);
		else if(data == "") //Else if there is no data (just a security check, it's not suppose to append)
		{
			f();
		}
		else
			try {
				settings = JSON.parse(data);
				fs.readFile(path.join(__dirname, "translation_files", "lang_" + settings.lang + ".json"), 'utf8', function(err, data) {
					if(err)
						handleError(err);
					else
						try {
							jstranslate = JSON.parse(data);
							translate(function() { //Everything is normal
									normalLaunch(); //Launch thcrap the normal way
							});
						} catch(e) { handleError(e); }
				});
			} catch(e) { return handleError(e); }
	});
}
function handleError(err) //If there is a error, remove all type of fullscreen loading and warn the user
{
	console.error(err);
	addError();
	smallLoading(false);
	unblankSection();
	return false;
}
function addError() //Warn the user about an error with a error counter
{
	if($(".menu .error-section").length == 0)
	{
		$(".menu").append('<div class="error-section"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path d="M.5 16h17L9 1 .5 16zm9.5-2H8v-2h2v2zm0-3H8V7h2v4z"/></svg><span class="error-count">0</span></div>');
		$(".error-section").on("click", function() { //The counter can be clicked to remove it
			$(".error-section").remove();
		});
	}
	$(".error-section .error-count").text(parseInt($(".error-section .error-count").text())+1);
}
function saveSettings(_callback) //Util function to save settings then run the callback fn
{
	fs.writeFile("settings.json", JSON.stringify(settings), function(err) {
		if(err) handleError(err);
		else if(typeof _callback === "function")
			_callback();
	});
}
function getPosition(obj) //Get the absolute position of an DOMElement
{
	var p = {x: obj.offsetLeft, y: obj.offsetTop};
	var b = $("body")[0];
	while(obj != b)
	{
		p.x += obj.offsetParent.offsetLeft;
		p.y += obj.offsetParent.offsetTop;
		obj = obj.offsetParent;
	}
	return p;
}
function loadTutorial(forced) //Load the tutorial. The forced parameter define if the tutorial has been launch by the software at first launch or asked by the user
{
	$(".tutorial-background").off('*').remove();
	var tutorialIndex = 0;
	var tutorialSequence = [ //This is the tutorial sequence, it's just an array of all the elements being highlighted during the tutorial, with the description trid text
		{elmt: null, trid: "welcome"},
		{elmt: ".game-server-button", trid: "game-server-tutorial"},
		{elmt: ".game-search-button", trid: "game-search-tutorial"},
		{elmt: ".new-profile-button", trid: "new-profile-tutorial"},
		{elmt: ".select-patch-button", trid: "select-patch-tutorial"},
		{elmt: ".save-profile-button", trid: "save-profile-tutorial"},
		{elmt: ".launch-game-button", trid: "launch-game-tutorial"}
	];
	$("body").append('<div class="tutorial-background"><div class="tutorial-foreground"></div><div class="tutorial-text"><p></p><span class="tutorial-next-button"></span></div></div>'); //Prompt the default tutorial HTML
	printTutorialInfo(tutorialSequence[tutorialIndex].elmt, tutorialSequence[tutorialIndex].trid);
	tutorialIndex++;
	$(".tutorial-next-button").on("click", function() {
		if(tutorialIndex != tutorialSequence.length)
		{
			printTutorialInfo(tutorialSequence[tutorialIndex].elmt, tutorialSequence[tutorialIndex].trid);
			tutorialIndex++;
		}
		else //When we have read all the tutorial sequence
		{
			$(".tutorial-next-button").off("click");
			$(".tutorial-background").remove();
			if(!forced) //If the tutorial has been launch from the first launch, run the normal launch to setup everything
					normalLaunch();
		}
	});
}
function printTutorialInfo(elmt, trid) //Print the tutorial instruction by highlighting an element and giving a description
{
	if(elmt)
	{
		var p = getPosition($(elmt)[0]);
		var x = p.x,
		y = p.y,
		w = $(elmt).outerWidth(),
		h = $(elmt).outerHeight();
		$(".tutorial-foreground").css({display: "flex", top: y + "px", left: x + "px", width: w + "px", height: h + "px"}); //Perfectly center the highlighter on the element
		remote.getCurrentWindow().on("resize", function() {
			p = getPosition($(elmt)[0]);
			x = p.x,
			y = p.y,
			w = $(elmt).outerWidth(),
			h = $(elmt).outerHeight();
			$(".tutorial-foreground").css({display: "flex", top: y + "px", left: x + "px", width: w + "px", height: h + "px"}); //Perfectly center the highlighter on the element
		});
	}
	else
		$(".tutorial-foreground").css({display: "none"}); //If there is no element to highlight, don't display the highlighter
	$(".tutorial-text p").text(individualTranslate(trid));
}
function getAllRepo(_callback) //Get the full repo list from the first_repo url in settings
{
	fetch = [settings.first_repo]; //Array of URL that need to be analyse
	fetched = []; //Already analysed list
	data = {}; //Data collected
	var loop = function() { //Async while
		var pro = new Promise(function(resolve, reject) {
			httpHandleRequest(fetch[0], "/repo.js", true, function(err, _data) { //Get the data from the repo URL
				if(err)
					reject(err);
				else
				{
					var dirpath = path.join(__dirname, "patches", _data.id);
					dirTest(dirpath, function() { //Save the repo to know which one we already have
						fs.writeFile(path.join(dirpath, "repo.js"), JSON.stringify(_data), function(err) {
							if(err)
								reject(err);
							else
							{
								data[_data.id] = _data; //Then collect the data
								if(_data.neighbors != undefined)
									_data.neighbors.forEach(function(i) { //Add all the neighbors we don't already alalysed
										if(!fetch.includes(i) && !fetched.includes(i))
											fetch.push(i);
									});
								fetched.push(fetch[0]); //Set the actual repo as analysed
								fetch.splice(0, 1);
								resolve();
							}
						});
					});
				}
			});
		});
		pro.then(function() {
			if(fetch.length == 0) //While the fetching list in not empty
				_callback(data);
			else
				loop();
		}).catch(function(err) {
			if(err.code == "ENOENT")
				global_vars.patches = {};
			return handleError(err);
		});
	}
	if(fetch.length == 0)
		_callback(data);
	else
		loop();
}
function loadPatchesInfo() //Get all patches info (first need to get all repo, then gather all patch for every repo)
{
	if(!settings.updates.patchs) //Prompt proper loading depending on the user settings
		smallLoading(true, "update-check"); //Foreground loading
	else
		blankSection(); //Background loading
	getAllRepo(function(gdata) { //Get all the repo from the first_repo setting
		dlList = [];
		/*
			I just realised that this step is useless cause I already saved the repo data -_-'
		*/
		asyncFor(Object.keys(gdata), function(i, resolve, reject) { //For each repos, check difference between the local one and the internet one (if the local one exists)
			i = Object.keys(gdata)[i];
			fs.readFile(path.join(__dirname, "patches", gdata[i].id, "repo.js"), function(err, data) {
				if(err)
				{
					Array.prototype.push.apply(dlList, gdata[i].patches);
					resolve();
				}
				else
				{
					data = JSON.parse(data);
					if(data == null)
					{
						Array.prototype.push.apply(dlList, gdata[i].patches);
						resolve();
					}
					else
					{
						asyncFor(Object.keys(data.patches), function(j, _resolve, _reject) {
							j = Object.keys(data.patches)[j];
							fs.readFile(path.join(__dirname, "patches", gdata[i].id, j, "patch.js"), function(err, _data) {
								if(err)
									dlList.push(j);
								else
								{
									_data = JSON.parse(_data);
									if(_data == null)
										dlList.push(j);
								}
								_resolve();
							});
						}, function() {
							resolve();
						});
					}
				}
			});
		}, function() {
			getPatches(dlList, gdata);
		});
	});
}
function getPatches(list, gdata)
{
	global_vars.patches = {};
	patchesFromFiles(list, gdata, function(arr) {
		if(arr.length == 0)
		{
			smallLoading(false);
			unblankSection();
			return;
		}
		if(!settings.updates.patchs)
			printMainProgressbar(arr.length);
		else
			loadSection(arr.length);
		asyncFor(arr, function(i, resolve, reject) {
			i = arr[i];
			var repo = gdata[Object.keys(gdata).find(function(e) { return Object.keys(gdata[e].patches).includes(i); })];
			httpHandleRequest(repo.servers[0], i + "/patch.js", true, function(err, data) {
				if(err)
					reject(err);
				else
				{
					var dirpath = path.join(__dirname, "patches", repo.id, i);
					dirTest(dirpath, function() {
						fs.writeFile(path.join(dirpath, "patch.js"), JSON.stringify(data), function(err) {
							if(err)
								reject(err);
							data.repo = repo.id;
							global_vars.patches[repo.id][i] = data;
							if(!settings.updates.patchs)
								increaseMainProgressbar();
							else
								increaseSectionLoad();
							resolve();
						});
					});
				}
			});
		}, function() {
			if(!settings.updates.patchs)
				smallLoading(false);
			else
				unblankSection();
		});
	});
}
function patchesFromFiles(arr, gdata, _callback)
{
	asyncFor(Object.keys(gdata), function(i, resolve, reject) {
		i = Object.keys(gdata)[i];
		global_vars.patches[i] = {};
		asyncFor(Object.keys(gdata[i].patches), function(j, _resolve, _reject) {
			j = Object.keys(gdata[i].patches)[j];
			if(!arr.includes(j))
			{
				fs.readFile(path.join(__dirname, "patches", i, j, "patch.js"), function(err, data) {
					if(err)
						arr.push(j);
					else
					{
						data = JSON.parse(data);
						data.repo = i;
						global_vars.patches[i][j] = data;
					}
					_resolve();
				});
			}
			else
				_resolve()
		}, function() {
			resolve();
		});
	}, function() {
		_callback(arr);
	});
}
function blankSection()
{
	smallLoading(false);
	$($(".wrapper").children()[1]).append("<div class='loading-section'></div>");
}
function unblankSection()
{
	$(".loading-section").remove();
}
function loadSection(size)
{
	$(".loading-progressbar").remove();
	$(".loading-section").append("<div class='loading-progressbar'><div class='loading-progress' max-size='" + size + "' size='0'></div></div>");
}
function increaseSectionLoad()
{
	$(".loading-progressbar .loading-progress").attr("size", parseInt($(".loading-progressbar .loading-progress").attr("size")) + 1);
	$(".loading-progressbar .loading-progress").css({width: ($(".loading-progressbar .loading-progress").attr("size") / $(".loading-progressbar .loading-progress").attr("max-size") * 100) + "%"});
}
function testGames(_callback)
{
	new Promise(function(resolve, reject) {
		for(var itm in settings.games)
		{
			try {
				fs.accessSync(settings.games[itm], fs.constants.R_OK);
			} catch(e) { settings.games[itm] = null; }
			if(itm == Object.keys(settings.games)[Object.keys(settings.games).length - 1])
				resolve();
		}
	}).then(function() {
		if(typeof _callback === "function")
			saveSettings(_callback);
		else
			saveSettings();
	});
}
function selectLanguage(core, _callback)
{
	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

	var availableLanguages = ["en", "fr"];
	var languages = ["en", "fr", "de", "id", "it", "ru", "vi", "es", "pt", "ar"];

	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

	core.append("<div class='popup-lang-picker'></div>");
	languages.forEach(function(i) {
		if(availableLanguages.find(function(e) { return e === i; }))
		{
			$('.popup-lang-picker').append('<div class="lang-picker" lang="' + i + '"></div>');
			$(".lang-picker").on('click', function() {
				settings.lang = $(this).attr('lang');
				saveSettings(function() { 
					fs.readFile(path.join(__dirname, "translation_files", "lang_" + (settings.lang || defaultSettings.lang) + ".json"), 'utf8', function(err, data) {
						if(err)
							handleError(err);
						else
							try {
								jstranslate = JSON.parse(data);
								translate(function() {
									if(typeof _callback === "function")
										_callback();
								});
							} catch(e) { handleError(e); }
					});
				});
			});
		}
		else
			$('.popup-lang-picker').append('<div class="lang-picker not-available-language" lang="' + i + '" onmouseenter="printPersonnalInfo(this, \'not-implement\', \'info\', true)"></div>');
	});
}
function setRepo(_callback)
{
	appendPopup("repo-pick", false, function(elmt) {
		elmt.append("<div class='popup-repo-wrapper'><input class='popup-repo-input'/><button class='popup-repo-confirm button' trid='popup-confirm'>" + individualTranslate("popup-confirm") + "</button><button class='popup-repo-cancel button' trid='popup-cancel'>" + individualTranslate("popup-cancel") + "</button></div>");
		$('.popup-repo-input').attr('value', settings.first_repo);
		$('.popup-repo-confirm').on('click', function() {
			settings.first_repo = $('.popup-repo-input').val();
			if(typeof _callback === "function")
				saveSettings(closePopup(_callback()));
			else
				saveSettings(closePopup());
		});
		$('.popup-repo-cancel').on('click', function() {
			closePopup();
		});
	});
}
function showPreferences()
{
	settingsPopup();
	addSettingsSection("settings-tab-setting", function(core) {
		settingsSetup(core);
	});
	addSettingsSection("settings-tab-games", function(core) {
		core.append("<div class='settings-games-core'><span class='settings-games-games' trid='settings-games-games'>" + individualTranslate("settings-games-games") + "</span></div></div>");
		var x = Object.keys(settings.games).sort()
		for(i in x)
		{
			i = x[i];
			$(".settings-games-core").append('<div class="settings-games-choose">' + (isNaN(parseInt(i)) ? (gamesNames[i].en) : ('Touhou ' + parseGameNumber(i))) + ': <input class="settings-games-input" game-id="' + i + '" ' + (gamesNames[i].infos == null ? 'value="' + (settings.games[i] == null ? '' : settings.games[i]) : 'placeholder="' + individualTranslate(gamesNames[i].infos)) + '" ' + (gamesNames[i].infos == null ? '' : 'disabled="disabled"') + '/></div>');
		}
		core.append("<div class='settings-games-save-games button' trid='settings-games-save-games'>" + individualTranslate("settings-games-save-games") + "</div>");
		$(".settings-games-save-games").on("click", function() {
			var wrong = false;
			var x = Object.keys(settings.games).sort();
			asyncFor(x, function(i, resolve, reject) {
				i = x[i];
				if($(".settings-games-input[game-id='" + i + "']").val() == "")
					resolve();
				else
					getGameInfos($(".settings-games-input[game-id='" + i + "']").val(), function(id) {
						if(id)
							settings.games[i] = $(".settings-games-input[game-id='" + i + "']").val();
						else
						{
							wrong = true;
							printPersonnalInfo($(".settings-games-input[game-id='" + i + "']"), "settings-not-a-game", "warn", true);
						}
						resolve();
					}, false);
			}, function() {
				if(!wrong)
					saveSettings(addTableSection);
			});
		});
	});
	addSettingsSection("about", function(core) {
		core.append("<div class='who-paragraph' trid='who-paragraph'>" + individualTranslate("who-paragraph") + "</div><br><div class='software-paragraph' trid='software-paragraph'>" + individualTranslate("software-paragraph") + "</div><div class='button reset-tutorial' trid='reset-tutorial'>" + individualTranslate("reset-tutorial") + "</div>");
		$(".link").on("click", function() {
			require('electron').shell.openExternal($(this).attr("href"));
		});
		$(".reset-tutorial").one("click", function() {
				$(".fullscreen-background *").off('*');
				$(".fullscreen-background").remove();
				loadTutorial(true);
		});
	});
}
function settingsPopup()
{
	$("body").append("<div class='fullscreen-background'><div class='settings-popup'><div class='settings-wrapper'><div class='settings-tabs'></div><div class='settings-core'></div></div><div class='close-settings'><svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'><path d='M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z'/></svg></div></div></div>");
	$('.close-settings').one('click', function() {
		$(".fullscreen-background *").off('*');
		$(".fullscreen-background").remove();
	});
}
function addSettingsSection(trid, fn)
{
	$(".settings-popup").find(".settings-tabs").append("<div class='" + trid + " settings-single-tab' trid='" + trid + "'>" + individualTranslate(trid) + "</div>").find("." + trid).on("click", function() {
		selectSettingTab(this, fn);
	});
}
function addSubSection(c, trid, _callback)
{
	var e = c.append("<div class='settings-sub'><div class='settings-subtitle' trid='" + trid + "'>" + individualTranslate(trid) + "</div></div>").children();
	e = $(e[e.length - 1]);
	_callback(e);
}
function selectSettingTab(elmt, fn)
{
	if($(elmt).hasClass("selected-tab"))
		return;
	else
	{
		$(".settings-single-tab").removeClass("selected-tab");
		$(elmt).addClass("selected-tab");
		$(".settings-core *").off("*");
		$(".settings-core")[0].innerHTML = "";
		fn($(".settings-core"));
	}
}
function settingsSetup(core)
{
	addSubSection(core, "language", function(e) {
		selectLanguage(e);
	});
	addSubSection(core, "settings-subtab-updates", function(e) {
		e.append("<div class='settings-check-title' trid='background-update-patchs'>" + individualTranslate("background-update-patchs") + "<div class='checkable settings-patch-check' " + (settings.updates["patchs"] ? "checked='checked'" : "") + "></div>" + "</div>");
		e.append("<div class='settings-check-title' trid='background-update-games'>" + individualTranslate("background-update-games") + "<div class='checkable settings-games-check' " + (settings.updates["games"] ? "checked='checked'" : "") + "></div>" + "</div>");
		$(".checkable").on("click", function() {
			$(this).attr("checked", !$(this).attr("checked"));
			settings.updates[$(this).parent().attr("trid").substr(18)] = !settings.updates[$(this).parent().attr("trid").substr(18)];
			saveSettings();
		});
	});
}
function searchGames(_callback)
{
	appendPopup("games-research", false, function(elmt) {
		elmt.append("<div class='popup-games-wrapper'><button class='popup-search-everywhere button' trid='search-everywhere'>" + individualTranslate("search-everywhere") + "</button><button class='popup-search-specific button' trid='search-specific'>" + individualTranslate("search-specific") + "</button></div>");
		$('.popup-search-everywhere').on('click', function() {
			getLogicalDisks(function(d) {
				g = [];
				if(Array.isArray(d))
					asyncFor(d, function(i, resolve, reject) {
						searchForGames(d[i] + path.sep, function(_g) {
							Array.prototype.push.apply(g, _g);
							resolve();
						});
					}, function() {
						analyseGames(g);
					});
				else
					searchForGames(d, function(games) {
						analyseGames(games);
					});
			});
		});
		$('.popup-search-specific').on('click', function() {
			remote.dialog.showOpenDialog(remote.getCurrentWindow(), { properties: ['openDirectory']}, function(dir) {
				if(dir !== undefined)
					searchForGames(dir[0], function(games) { analyseGames(games); });
			});
		});
	});
	if(typeof _callback === "function")
		_callback();
}
function analyseGames(games)
{
	if(Array.isArray(games) && games.length !== 0)
	{
		var gameConflict = {};
		asyncFor(games, function(i, resolve, reject) {
			getGameInfos(games[i], function(id) {
				if(id[0] && !id[3])
				{
					if(settings.games[id[0]] && settings.games[id[0]] != games[i])
						if(gameConflict[id[0]] == undefined)
								gameConflict[id[0]] = [settings.games[id[0]], games[i]];
							else
								gameConflict[id[0]].push(games[i]);
					else
						settings.games[id[0]] = games[i];
				}
				else if(id[0] && id[3])
					settings.custom[id[0]] = games[i];
				resolve();
			}, true);
		}, function() {
			smallLoading(false);
			closePopup();
			if(Object.keys(gameConflict).length != 0)
			{
				promptGameChoice(gameConflict, function(selectedGames) {
						if(selectedGames)
							for(j in selectedGames)
								settings.games[j] = selectedGames[j];
					saveSettings();
					addTableSection();
				});
			}
			else
			{
				saveSettings();
				addTableSection();
			}
		});
	}
	else
		smallLoading(false);
}
function promptGameChoice(gameObj, _callback) //callback an object
{
	appendPopup("several-found", false, function(elmt) {
		elmt.append('<div class="game-choice-wrapper"><div class="game-choice-scroller"></div><div class="button game-choice-confirm" trid="popup-confirm">' + individualTranslate("popup-confirm") + '</div>');
		asyncFor(Object.keys(gameObj), function(i, resolve, reject) {
			i = Object.keys(gameObj)[i];
			$(".game-choice-scroller").append("<div class='game-choice-body' game-id='" + i + "'></div>");
			asyncFor(gameObj[i], function(j, _resolve, _reject) {
				getGameInfos(gameObj[i][j], function(id) {
					$(".game-choice-body[game-id='" + i + "']").append("<div class='game-choice-choice' game-id='" + i + "' choice-index='" + j + "' onmouseenter='printPersonnalInfo(this, \"" + (gameObj[i][j].replace(/\\/g, "\\\\")) + "\", \"info\", false);'>" + (id[3] ? "Custom " : "Touhou ") + id[0] + " " + id[1] + " " + id[2] + "</div>");
					
					$(".game-choice-body[game-id='" + i + "'] .game-choice-choice").on("click", function() {
						$(".game-choice-choice[game-id='" + i + "']").removeClass("game-choice-selected");
						$(this).addClass("game-choice-selected");
					});

					_resolve();
				}, true);
			}, function() {
				resolve();
			});
		}, function() {

		});
		$(".game-choice-confirm").on("click", function() {
			returned = {};
			$(".game-choice-choice.game-choice-selected").each(function() {
				returned[$(this).attr("game-id")] = gameObj[$(this).attr("game-id")][$(this).attr("choice-index")];
			});
			closePopup();
			_callback(returned);
		});
	});
}
function getGameInfos(dir, _callback, secured)
{
	fs.readFile(path.join(__dirname, "version.js"), function(err, data) {
		if(err)
			_callback(null);
		else
		{
			data = JSON.parse(data);
			if(!secured)
			{
				fs.lstat(dir, function(err, stats) {
					if(err)
						_callback(null);
					else
					{
						var id;
						if(Object.keys(data.sizes).includes(stats.size.toString()))
							id = data.sizes[Object.keys(data.sizes).find(function(elmt) { return elmt === stats.size.toString(); })];
						else
							_callback(null);
						if(id[0].includes("_custom"))
						{
							id[0] = id[0].replace("_custom", "");
							if(id[0].includes("th"))
								id[0] = id[0].substr(2);
							id[3] = true;
						}
						else
						{
							id[0] = id[0].substr(2);
							id[3] = false;
						}
						_callback(id);
					}
				});
			}
			else
			{
				const hash = crypto.createHash('sha256');

				const input = fs.createReadStream(dir);
				input.on('readable', () => {
					const _data = input.read();
					if (_data)
						hash.update(_data);
					else
					{
						var id = hash.digest('hex');
						if(Object.keys(data.hashes).includes(id.toString()))
							id = data.hashes[Object.keys(data.hashes).find(function(elmt) { return elmt === id.toString(); })];
						else
							_callback(null);
						if(id[0].includes("_custom"))
						{
							id[0] = id[0].replace("_custom", "");
							if(id[0].includes("th"))
								id[0] = id[0].substr(2);
							id[3] = true;
						}
						else
						{
							id[0] = id[0].substr(2);
							id[3] = false;
						}
						_callback(id);
					}
				});
			}
		}
	});
}
function appendPopup(trid, vert, _callback)
{
	$('.popup-background').remove();
	$('body').append("<div class='popup-background'><div class='popup-core'><div class='popup-wrapper'><div class='popup-title' trid='" + trid + "'>" + individualTranslate(trid) + "</div><div class='popup-content-wrapper " + (vert ? 'flex-vertical' : '') + "'></div></div><span class='close-popup'><svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'><path d='M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z'/></svg></span></div></div>");
	$('.close-popup').one('click', function() {
		closePopup();
	});
	if(typeof _callback === "function")
		_callback($(".popup-content-wrapper"));
}
function closePopup(_callback)
{
	$(document).off();
	$('.popup-background *').off();
	$('.popup-background').off().remove();
	if(typeof _callback === "function")
		_callback();
}
function translate(_callback)
{
	var lang = settings.lang || defaultSettings.lang;
	$('[trid]').each(function() {
		$(this).contents()[0].textContent = typeof individualTranslate($(this).attr("trid")) === "undefined" ? "unknown" : individualTranslate($(this).attr("trid"));
	});
	if(typeof _callback === "function")
		_callback();
}
function individualTranslate(trid)
{
	return typeof jstranslate[trid] !== "string" ? (handleError(new Error("Can't find translate value for " + trid + "(" + jstranslate[trid] + ")")), $('[trid="' + trid + '"]').contents()[0].textContent) : jstranslate[trid];
}
function normalLaunch()
{
	settingsUpdate();
	testGames(addTableSection);
	getProfiles(loadPatchesInfo);
}
function settingsUpdate()
{
	if(Object.keys(settings.games).includes("9.5"))
	{
		for(itm in settings.games)
		{
			if(itm < 10)
				gameName = "0" + itm.replace(".", "");
			else
				gameName = itm.replace(".", "");
			settings.games[gameName] = settings.games[itm];
			if(gameName !== itm)
				delete settings.games[itm];
		}
		for(itm in settings.custom)
		{
			if(itm < 10)
				gameName = "0" + itm.replace(".", "");
			else
				gameName = itm.replace(".", "");
			settings.custom[gameName] = settings.custom[itm];
			if(gameName !== itm)
				delete settings.custom[itm];
		}
	}
	if(!Object.keys(settings.games).includes("155"))
	{
		settings.games["155"] = null;
		settings.custom["155"] = null;
	}
	if(!Object.keys(settings.games).includes("megamari"))
	{
		settings.games["megamari"] = null;
		settings.custom["megamari"] = null;
	}
	if(!Object.keys(settings.games).includes("nsml"))
	{
		settings.games["nsml"] = null;
		settings.custom["nsml"] = null;
	}
	if(!Object.keys(settings.games).includes("alcostg"))
	{
		settings.games["alcostg"] = null;
		settings.custom["alcostg"] = null;
	}
	if(Object.keys(settings).includes("version"))
	{
		delete settings.version;
	}
	if(settings.updates === undefined)
	{
		settings.updates = {
			patchs: false, 
			games: false
		};
	}
	saveSettings();
}
function addTableSection()
{
	$('.games-table tbody .game-row').remove();
	var x = Object.keys(settings.games).sort();
	asyncFor(x, function(i, resolve, reject) {
		i = x[i];
		if(settings.games[i] != null)
			getGameInfos(settings.games[i], function(id) {
				if(id)
					$(".games-table tbody").append("<tr class='game-row' onclick='$(\".selected-row\").removeClass(\"selected-row\"); $(this).addClass(\"selected-row\");' ondblclick='launch()' game-id='" + i + "'>\
						<td class='game-table-number'>" + parseGameNumber(i) + "</td>\
						<td class='game-table-jp-name'>" + tableHandleUnknown(gamesNames[i].jp) + "</td>\
						<td class='game-table-sub'>" + tableHandleUnknown(gamesNames[i].en) + "</td>\
						<td class='game-table-version'>" + id[1] + "</td>\
					</tr>");
				resolve();
			}, false);
		else
			resolve();
	});
}
function parseGameNumber(id)
{
	if(id.length === 3)
		return id[0] + id[1] + "." + id[2];
	else
		return id;
}
function tableHandleUnknown(elmt)
{
	if(!elmt)
		return "<span trid='unknown'>" + individualTranslate("unknown") + "</span>";
	return elmt;
}
function searchForGames(dir, _callback)
{
	var g = [], dl = [];
	var v = {};
	var loop = function(d)
	{
		var p = new Promise(function(resolve, reject) {
			fs.lstat(d, function(err, s) {
				if(err)
					resolve();
				else if(s.isDirectory())
				{
					fs.readdir(d, function(e, f) {
						if(!e)
						{
							for(i in f)
								f[i] = path.join(d.substr(dir.length), f[i]);
							Array.prototype.push.apply(dl, f);
						}
						resolve();
					});
				}
				else if(s.isFile())
				{
					if(path.extname(d) === ".exe" && Object.keys(v.sizes).includes(s.size.toString()))
					{
						const hash = crypto.createHash('sha256');

						const input = fs.createReadStream(d);
						input.on('readable', () => {
							const data = input.read();
							if (data)
								hash.update(data);
							else
							{
								if(Object.keys(v.hashes).includes(hash.digest('hex')))
								{
									g.push(d);
									console.log(" ////////////////////// Found " + d + " ///////////////////////////////////// ");
								}
								resolve();
							}
						});
					}
					else
						resolve();
				}
				else
					resolve();
			});
		});
		p.then(function() {
			dl.splice(0, 1);
			if(dl.length !== 0 && global_vars.stopped === false)
				loop(path.join(dir, dl[0]));
			else
			{
				delete global_vars.stopped;
				_callback(g);
			}
		});
	};
	fs.readFile(path.join(__dirname, "version.js"), function(err, data) {
		v = JSON.parse(data);
		loop(dir);
	});
	smallLoading(true, "searching-games");
	if(global_vars.stopped === undefined)
		global_vars.stopped = false;
	$(".fullscreen-background").append("<button class='button popup-cancel-button' trid='popup-cancel' onclick='global_vars.stopped = true;'>" + individualTranslate('popup-cancel') + "</button>");
}
function getLogicalDisks(_callback)
{
	const exec = require("child_process").exec;
	if(process.platform === "win32")
		exec("wmic logicaldisk get caption", function(err, stdout, stderr) {
			if(err)
				console.log(err);
			var disks = stdout.split("\n")
			disks.forEach(function(itm, idx) {
				disks[idx] = itm.trim();
			});
			disks.splice(0, 1);
			disks.splice(disks.length - 2, 2);
			_callback(disks);
		});
	else if(process.platform === "darwin")
	{
		//sorry, don't know the file system of Mac
	}
	else
		_callback("");
}
function smallLoading(state, msg) // true = append small loading, false = remove small loading
{
	$(".fullscreen-background").remove();
	if(state)
		if(msg)
			$('body').append("<div class='fullscreen-background'><div class='small-loading'></div><div class='small-loading-info' trid='" + msg + "'>" + individualTranslate(msg) + "</div></div>");
		else
			$('body').append("<div class='fullscreen-background'><div class='small-loading'></div></div>");
}
function saveGamesSettings(files, _callback)
{
	var basename;
	var game;
	var gameId;
	files.forEach(function(itm) {
		basename = path.basename(itm, ".exe");
		game = basename.substr(2);
		if(game.length == 3)
			gameId = parseInt(game, 10) / 10;
		else
			gameId = parseInt(game, 10);
		settings.games[gameId] = itm;
		fs.readFile(path.dirname(itm) + "")
	});
	saveSettings(function() {
		if(typeof _callback === "function")
			_callback();
	});
}
function getProfiles(_callback)
{
	fs.readdir(path.join(__dirname, "patches"), function(err, files) {
		if(err)
			handleError(err);
		var profile = {};
		if(files.length == 0)
			return global_vars.profile = undefined;
		(function loop(itm) {
			var pro = new Promise(function(resolve, reject) {
				fs.stat(path.join(__dirname, "patches", itm), function(err, stat) {
					if(err)
						reject(err);
					if(stat.isFile() && path.extname(itm) == ".js" && itm != "games.js" && itm != "config.js")
						fs.readFile(path.join(__dirname, "patches", itm), function(err, data) {
							if(err)
								reject(err);
							else
							{
								try {
									var body = JSON.parse(data);
									resolve(body);
								}
								catch(e) { resolve(false); }
							}
						});
					else
					{
						resolve(false);
					}
				});
			});
			pro.then(function(state) {
				if(typeof state === "object")
				{
					itm = path.basename(itm, ".js");
					profile[itm] = state;
				}
				if(files.length != 1)
				{
					files.splice(0, 1);
					loop(files[0]);
				}
				else
				{
					delete global_vars.profile;
					global_vars.profile = profile;
					loadProfiles(_callback);
				}
			}).catch(function(err) {
				handleError(err);
			});
		})(files[0]);
	});
}
function loadProfiles(_callback)
{
	$(".profile-select > div").off("click blur keydown").remove();
	for(var itm in global_vars.profile)
	{
		$(".profile-select").append("<div value='" + itm + "'>" + itm + "</div>");
	}
	renderProfile();
	if(typeof _callback === "function")
		_callback();
	selectProfile();
	$(".profile-select > div").dblclick(function() {
		if($(".selected-profile").attr("disabled") === "disabled")
		{
			printPersonnalInfo($(".selected-profile")[0], "cant-change-profile", 'info', true);
			return;
		}
		$(".profile-select > div").removeClass("selected-profile").off("click blur keydown");
		$(this).attr("contenteditable", true);
		onRenameEndEvent();
		selectProfile();
	});
}
function selectProfile()
{
	$(".profile-select > div[contenteditable!=true]").on("click", function() {
		$(".profile-select > div").removeClass("selected-profile").attr("contenteditable", false).off("click blur keydown");
		$(this).addClass("selected-profile");
		if(Object.is(JSON.parse(fs.readFileSync(path.join(__dirname, "patches", $(this).attr("value") + ".js"))), global_vars.profile[$(this).attr("value")]))
			$(".save-profile-button").addClass("save");
		else
			$(".save-profile-button").removeClass("save");
		renderProfile();
		selectProfile();
	});
}
function renderProfile()
{
	$(".patch-scroller *").off("click").remove();
	$(".patch-infos").text("");
	if($(".selected-profile").length != 1)
		return;
	global_vars.profile[$(".selected-profile").text()].patches.forEach(function(itm, idx) {
		var elmt = itm.archive.split("/");
		$(".patch-scroller").append("<div class='table-patch' repo='" + elmt[0] + "' value='" + elmt[1] + "'>" + elmt[1] + "</div>");
	});
	$(".table-patch").on("click", function() {
		$(".table-patch").removeClass("selected-table-patch");
		$(this).addClass("selected-table-patch");
		$(".patch-infos").text(global_vars.patches[$(".selected-table-patch").attr("repo")][$(".selected-table-patch").attr("value")].title);
	});
}
function onRenameEndEvent()
{
	$(".profile-select > div[contenteditable=true]").on("keydown", function(e) {
		if(e.keyCode == 13)
			saveProfileRename(this);
	});
	$(".profile-select > div[contenteditable=true]").on("blur", function() {
		saveProfileRename(this);
	});
}
function saveProfileRename(elmt)
{
	_this = elmt;
	$(_this).text($(_this).text().replace(/\s/gi, "_"))
	if((Object.keys(global_vars.profile).find(function(elmt) {return elmt === $(_this).text();}) && $(_this).text() !== $(_this).attr("value")) || $(_this).text() == "")
	{
		$(_this).text($(_this).attr("value"));
		loadProfiles();
	}
	else
	fs.rename(path.join(__dirname, "patches", $(_this).attr("value") + ".js"), path.join(__dirname, "patches", $(_this).text() + ".js"), function(err) {
		if(err)
		{
			handleError(err);
			$(_this).text($(_this).attr("value"));
		}
		else
		{
			global_vars.profile[$(_this).text()] = global_vars.profile[$(_this).attr("value")];
			delete global_vars.profile[$(_this).attr("value")];
			$(_this).attr("value", $(_this).text());
			getProfiles();
		}
	});
}
function createProfile()
{
	smallLoading(true);
	const profile_base = {console: false, dat_dump: false, patches: []};
	var profile_name = "";
	if(typeof global_vars.profile !== "undefined" && Object.keys(global_vars.profile).length != 0)
		profile_name = "_(" + Object.keys(global_vars.profile).length + ")";
	fs.writeFile(path.join(__dirname, "patches", "Profile" + profile_name + ".js"), JSON.stringify(profile_base), function(err) {
		if(err)
			handleError(err);
		else
			getProfiles(smallLoading(false));
	});
}
function removeProfile()
{
	if($(".profile-select > .selected-profile").length != 1)
	{
		printPersonnalInfo($(".remove-profile-button")[0], 'no-profile-selected', 'info', true);
		return;
	}
	if($(".selected-profile").attr("disabled") === "disabled")
	{
		printPersonnalInfo($(".remove-profile-button")[0], "cant-change-profile", 'info', true);
		return;
	}
	smallLoading(true);
	fs.unlink(path.join(__dirname, "patches", $(".profile-select > .selected-profile").text() + ".js"), function(err) {
		if(err)
			handleError(err);
		getProfiles(smallLoading(false));
	});
}
function saveProfile()
{
	if($(".profile-select > .selected-profile").length != 1)
	{
		printPersonnalInfo($(".save-profile-button")[0], 'no-profile-selected', 'info', true);
		return;
	}
	if($(".selected-profile").attr("disabled") === "disabled")
	{
		printPersonnalInfo($(".save-profile-button")[0], "cant-change-profile", 'info', true);
		return;
	}
	fs.writeFile(path.join(__dirname, "patches", $(".profile-select > .selected-profile").text() + ".js"), JSON.stringify(global_vars.profile[$(".profile-select > .selected-profile").text()]), function(err) {
		if(err)
			handleError(err);
		$(".save").removeClass("save");
	});
}
function selectPatch()
{
	if(global_vars.patches == undefined)
	{
		printPersonnalInfo($(".select-patch-button")[0], "internal-error-undef-patches", 'warn', true);
		return;
	}
	if($(".selected-profile").length != 1)
	{
		printPersonnalInfo($(".select-patch-button")[0], "no-profile-selected", 'info', true);
		return;
	}
	if(Object.keys(global_vars.patches).length == 0)
	{
		printPersonnalInfo($(".select-patch-button")[0], "no-patch-due-to-internet", "info", true);
		return;
	}
	if($(".selected-profile").attr("disabled") === "disabled")
	{
		printPersonnalInfo($(".select-patch-button")[0], "cant-change-profile", 'info', true);
		return;
	}
	var patch = [];
	$("body").append("<div class='patch-background'><div class='patch-selector-outer'><div class='patch-selector'></div><div class='patch-buttons'><button class='button patch-select-confirm' trid='patch-select-confirm'>Confirm</button><button class='button patch-select-cancel' trid='patch-select-cancel'>Cancel</button></div></div></div>");
	translate();
	for(var itm in global_vars.patches)
	{
		for(var itm2 in global_vars.patches[itm])
		{
			if(Object.values(global_vars.profile[$(".selected-profile").attr("value")].patches).find(function(elmt) { return elmt.archive === itm + "/" + itm2 + "/";}))
				$("body .patch-selector").append('<div class="patch-selection"><span class="patch-check selected-check" repo="' + itm.replace("'", "\'") + '" value="' + itm2.replace("'", "\'") + '"></span>' + itm2 + '</div>');
			else
				$("body .patch-selector").append('<div class="patch-selection"><span class="patch-check" repo="' + itm.replace("'", "\'") + '" value="' + itm2.replace("'", "\'") + '"></span>' + itm2 + '</div>');
		}
	}
	$(".patch-selection").on("click", function() {
		if(!$(this).children().filter(".patch-check").hasClass("selected-check"))
		{
			if(getDependencies(global_vars.patches[$(this).children().filter(".patch-check").attr("repo")][$(this).children().filter(".patch-check").attr("value")]))
			{
				var dependencies = getRepoAndValue(deleteMultiple(getDependencies(global_vars.patches[$(this).children().filter(".patch-check").attr("repo")][$(this).children().filter(".patch-check").attr("value")])));
				dependencies.forEach(function(itm, idx) {
				$('.patch-check[repo="' + itm[0].replace("'", "\'") + '"][value="' + itm[1].replace("'", "\'") + '"]').addClass("selected-check");
				});
			}
			$(this).children().filter(".patch-check").addClass("selected-check");
		}
		else
		{
			var dependents = getRepoAndValue(getDependent(global_vars.patches[$(this).children().filter(".patch-check").attr("repo")][$(this).children().filter(".patch-check").attr("value")]));
			dependents.forEach(function(itm, idx) {
				$('.patch-check[repo="' + itm[0].replace("'", "\'") + '"][value="' + itm[1].replace("'", "\'") + '"]').removeClass("selected-check");
			});
			$(this).children().filter(".patch-check").removeClass("selected-check");
		}
	});
	$(".patch-select-cancel").on("click", function() {
		$("body").children().filter(".patch-background").remove();
	});
	$(".patch-select-confirm").on("click", function() {
		var patch = $('.patch-check.selected-check');
		patches = patch.map(function() {
			return {archive: $(this).attr("repo") + "/" + $(this).attr("value") + "/"};
		});
		global_vars.profile[$(".selected-profile").text()].patches = patches.toArray();
		renderProfile();
		$("body").children().filter(".patch-background").remove();
		$(".save-profile-button").addClass("save");
	});
}
function getDependencies(elmt)
{
	if(typeof elmt === "undefined" || typeof elmt.dependencies === "undefined" || elmt.dependencies.length == 0)
		return;
	var depen = [];
	elmt.dependencies.forEach(function(itm, idx) {
		var arr = itm.split("/");
		if(arr.length == 2)
		{
			depen.push(global_vars.patches[arr[0]][arr[1]]);
			Array.prototype.push.apply(depen, getDependencies(global_vars.patches[arr[0]][arr[1]]));
		}
		else
		{
			if(typeof global_vars.patches[elmt.repo][arr[0]] === "undefined")
			{
				if(typeof findRepo(arr[0]) === "undefined")
					return [];
				depen.push(global_vars.patches[findRepo(arr[0])][arr[0]]);
				Array.prototype.push.apply(depen, getDependencies(global_vars.patches[findRepo(arr[0], elmt)][arr[0]]));
			}
			else
			{
				depen.push(global_vars.patches[elmt.repo][arr[0]]);
				Array.prototype.push.apply(depen, getDependencies(global_vars.patches[elmt.repo][arr[0]]));
			}
		}
	});
	return depen;
}
function getDependent(elmt)
{
	if(typeof elmt === "undefined")
		return;
	var depen = [];
	for(var repo in global_vars.patches)
	{
		for(var id in global_vars.patches[repo])
		{
			var dependencies = deleteMultiple(getDependencies(global_vars.patches[repo][id]));
			if(typeof dependencies !== "undefined")
				if(dependencies.find(function(_elmt) { return _elmt === elmt; }))
					depen.push(global_vars.patches[repo][id]);
		}
	}
	return depen;
}
function deleteMultiple(arr)
{
	if(typeof arr === "undefined")
		return;
	var unique = [];
	arr.forEach(function(itm) {
		if(!unique.find(function(elmt) { return elmt.id === itm.id; }))
			unique.push(itm);
	});
	return unique;
}
function getRepoAndValue(arr)
{
	var _arr = [];
	arr.forEach(function(itm, idx) {
		_arr[idx] = [itm.repo, itm.id];
	});
	return _arr;
}
function findRepo(id, elmt)
{
	for(var repo in global_vars.patches)
	{
		if(Object.keys(global_vars.patches[repo]).find(function(elmt) { return elmt === id; }))
			return repo;
	}
}
function printPersonnalInfo(elmt, text, type, doTrid)
{
	if(typeof elmt === "undefined" || typeof text !== "string")
		return;
	var _class;
	switch(type)
	{
		case "info":
		default:
			_class = "popup-info";
			break;
		case "warn":
		case "popup-warn":
			_class = "popup-warn";
			break;
	}
	var x, y, width, height;
	x = $(elmt).offset().left;
	y = $(elmt).offset().top;
	width = $(elmt).outerWidth();
	height = $(elmt).outerHeight();
	$(".popup-info, .popup-warn").remove();
	if(type == 'popup-warn')
		$("body").append("<div style='z-index: 5;' class='" + _class + "'>" + (doTrid ? individualTranslate(text) : text) + "</div>");
	else
		$("body").append("<div class='" + _class + "'>" + (doTrid ? individualTranslate(text) : text) + "</div>");
	$("." + _class).css({left: (x + width/2 - $("." + _class).outerWidth()/2) + "px", top: (y - height/2 - $("." + _class).outerHeight()/2) + "px"});
	$(elmt).one("mouseout", function() {
		$("." + _class).fadeOut(500, function() {
			$(this).remove();
		});
	});
}
function launch()
{
	$(".launch-game-button").attr("disabled", "disabled");
	if(gameLaunched)
	{
		printPersonnalInfo($('.launch-game-button')[0], 'game-already-launched', 'warn', true);
		$(".launch-game-button").removeAttr("disabled");
		return;
	}
	if($(".selected-profile").length != 1)
	{
		createGameFile(function() { launchGame($(".selected-row").attr("game-id"), $(".selected-profile").text()); });
		return;
	}
	if($(".selected-row").length != 1)
	{
		printPersonnalInfo($(".launch-game-button")[0], 'no-game-selected', 'info', true);
		$(".launch-game-button").removeAttr("disabled");
		return;
	}
	if(Object.keys(global_vars.patches).length == 0)
	{
		printPersonnalInfo($(".launch-game-button")[0], "no-patch-due-to-internet", "info", true);
		$(".launch-game-button").removeAttr("disabled");
		return;
	}
	if(global_vars.profile[$(".selected-profile").text()].patches.length === 0)
	{
		createGameFile(function() { launchGame($(".selected-row").attr("game-id"), $(".selected-profile").text()); });
		return;
	}
	$(".selected-profile").attr("disabled", "disabled");
	if(!settings.updates.games)
		smallLoading(true, "download-final-data");
	else
		buttonLoading($(".button.launch-game-button"));
	createGameFile();
	var proname = $(".selected-profile").text();
	var pro = global_vars.profile[proname].patches;
	var gameid = $(".selected-row").attr("game-id");
	printMainProgressbar(pro.length);
	asyncFor(pro, function(i, resolve, reject) {
		checkForUpdates(global_vars.patches[pro[i].archive.split("/")[0]][pro[i].archive.split("/")[1]], gameid, function(err, data) { //TODO: I can do file filtering here to reduce the async for requests
			console.log(err, data);
			if(err)
				reject(err);
			if(data && data.length !== 0)
			{
				printSecondaryProgressbar(data.length);
				dirTest(path.join(__dirname, "patches", pro[i].archive.split("/")[0], pro[i].archive.split("/")[1]));
				asyncFor(data, function(j, _resolve, _reject) {
					var dirpath = path.join(__dirname, "patches", data[j].repo, data[j].id, data[j].file);
					downloadAndSave(dirpath, global_vars.patches[data[j].repo][data[j].id].servers, data[j].file, function(err) {
						if(err)
							_reject(err);
						else
						{
							increaseSecondaryProgressbar();
							_resolve();
						}
					});
				}, function() {
					increaseMainProgressbar();
					resolve();
				}, function(e) {
					reject(e);
				});
			}
			else
			{
				increaseMainProgressbar();
				resolve();
			}
		});
	}, function() {
		if(!settings.updates.games)
			smallLoading(false);
		else
			buttonLoaded();
		launchGame(gameid, proname);
		$(".profile-select > div[disabled='disabled']").removeAttr("disabled");
	}, function(e) {
		if(e && e.code == "ENOENT")
			printPersonnalInfo($(".button.launch-game-button")[0], 'no-internet-connection', 'warn', true);
		if(!settings.updates.games)
			smallLoading(false);
		else
			buttonLoaded();
		$(".profile-select > div[disabled='disabled']").removeAttr("disabled");
	});
}
function config()
{
	$(".game-config-button").attr("disabled", "disabled");
	if(gameLaunched)
	{
		printPersonnalInfo($('.game-config-button')[0], 'game-already-launched', 'warn', true);
		$(".game-config-button").removeAttr("disabled");
		return;
	}
	if($(".selected-row").length != 1)
	{
		printPersonnalInfo($(".game-config-button")[0], 'no-game-selected', 'info', true);
		$(".game-config-button").removeAttr("disabled");
		return;
	}
	if(Object.keys(global_vars.patches).length == 0)
	{
		printPersonnalInfo($(".game-config-button")[0], "no-patch-due-to-internet", "info", true);
		$(".game-config-button").removeAttr("disabled");
		return;
	}
	if(!settings.custom[$(".selected-row").attr("game-id")])
	{
		printPersonnalInfo($(".game-config-button")[0], 'no-custom', 'info', true);
		return;
	}
	if($(".selected-profile").length != 1)
	{
		createGameFile(function() { launchConfig($(".selected-row").attr("game-id"), $(".selected-profile").text()); });
		return;
	}
	if(global_vars.profile[$(".selected-profile").text()].patches.length === 0)
	{
		createGameFile(function() { launchConfig($(".selected-row").attr("game-id"), $(".selected-profile").text()); });
		return;
	}
	if(!settings.updates.games)
		smallLoading(true, "download-final-data");
	else
		buttonLoading($(".button.game-config-button"));
	createGameFile();
	$(".selected-profile").attr("disabled", "disabled");
	var proname = $(".selected-profile").text();
	var pro = global_vars.profile[proname].patches;
	var gameid = $(".selected-row").attr("game-id");
	printMainProgressbar(pro.length);
	asyncFor(pro, function(i, resolve, reject) {
		checkForUpdates(global_vars.patches[pro[i].archive.split("/")[0]][pro[i].archive.split("/")[1]], gameid, function(err, data) {
			if(err)
				reject(err);
			if(data && data.length !== 0)
			{
				printSecondaryProgressbar(data.length);
				dirTest(path.join(__dirname, "patches", pro[i].archive.split("/")[0], pro[i].archive.split("/")[1]));
				asyncFor(data, function(j, _resolve, _reject) {
					var dirpath = path.join(__dirname, "patches", data[j].repo, data[j].id, data[j].file);
					downloadAndSave(dirpath, global_vars.patches[data[j].repo][data[j].id].servers, data[j].file, function(err) {
						if(err)
							_reject(err);
						else
						{
							increaseSecondaryProgressbar();
							_resolve();
						}
					});
				}, function() {
					increaseMainProgressbar();
					resolve();
				}, function(e) {
					reject(e);
				});
			}
			else
			{
				increaseMainProgressbar();
				resolve();
			}
		});
	}, function() {
		if(!settings.updates.games)
			smallLoading(false);
		else
			buttonLoaded();
		launchConfig(gameid);
		$(".profile-select > div[disabled='disabled']").removeAttr("disabled");
	}, function(e) {
		if(e && e.code == "ENOENT")
			printPersonnalInfo($(".button.game-config-button")[0], 'no-internet-connection', 'warn', true);
		if(!settings.updates.games)
			smallLoading(false);
		else
			buttonLoaded();
		$(".profile-select > div[disabled='disabled']").removeAttr("disabled");
	});
}
function buttonLoading(button)
{
	button.attr("text", button.text());
	button.attr("trid-disabled", button.attr("trid"));
	button.removeAttr("trid");
	button.text("");
	button.addClass("loading-button");
	button.parent().find(".button:not(.loading-button)").attr("disabled", "disabled");
}
function buttonLoaded()
{
	var button = $(".button.loading-button");
	button.children().remove();
	button.text(button.attr("text"));
	button.attr("trid", button.attr("trid-disabled"));
	button.removeAttr("trid-disabled");
	button.removeAttr("text");
	button.removeClass("loading-button");
	$(".button[disabled='disabled']").removeAttr("disabled");
}
function printMainProgressbar(size)
{
	if($(".small-loading-mainbar").length !== 1 && $(".loading-button").length !== 1)
		return;

	if($(".small-loading-mainbar").length === 1)
	{
		$(".small-loading-secondarybar").remove();
		$(".fullscreen-background").append('<div class="small-loading-mainbar small-loading-progressbar" max-size="' + size + '" size="0"><span class="progression"></span></div>');
	}
	else
	{
		$(".loading-progress").remove();
		$(".loading-button").append("<div class='loading-progress' max-size='" + size + "' size='0'></div>");
	}
}
function increaseMainProgressbar()
{
	if($(".small-loading-mainbar").length === 1)
	{
		$(".small-loading-secondarybar").remove();
		$(".small-loading-mainbar").attr("size", parseInt($(".small-loading-mainbar").attr("size")) + 1);
		$(".small-loading-mainbar .progression").animate({width: ($(".small-loading-mainbar").attr("size") / $(".small-loading-mainbar").attr("max-size") * 200) + "px"}, 100);
	}
	else
	{
		$(".loading-progress").attr("size", parseInt($(".loading-progress").attr("size")) + 1);
		$(".loading-progress").css({width: ($(".loading-progress").attr("size") / $(".loading-progress").attr("max-size") * 100) + "%"});
	}
}
function printSecondaryProgressbar(size)
{
	if($(".small-loading-mainbar").length !== 1 && $(".loading-button").length !== 1)
		return;

	if($(".small-loading-mainbar").length === 1)
	{
		$(".small-loading-secondarybar").remove();
		$(".fullscreen-background").append('<div class="small-loading-secondarybar small-loading-progressbar" max-size="' + size + '" size="0"><span class="progression"></span></div>');
	}
	else
	{
		$(".loading-progress").attr("sub-size", size);
		$(".loading-progress").attr("subsize", 0);
	}
}
function increaseSecondaryProgressbar()
{
	if($(".small-loading-mainbar").length === 1)
	{
		$(".small-loading-secondarybar").attr("size", parseInt($(".small-loading-secondarybar").attr("size")) + 1);
		$(".small-loading-secondarybar .progression").animate({width: ($(".small-loading-secondarybar").attr("size") / $(".small-loading-secondarybar").attr("max-size") * 200) + "px"}, 100);
	}
	else
	{
		$(".loading-progress").attr("subsize", parseInt($(".loading-progress").attr("subsize")) + 1);
		$(".loading-progress").css({width: ((parseInt($(".loading-progress").attr("size")) + parseInt($(".loading-progress").attr("subsize")) / parseInt($(".loading-progress").attr("sub-size"))) / $(".loading-progress").attr("max-size") * 100) + "%"});
	}
}
function createGameFile(_callback)
{
	var gameObject = {};
	for(itm in settings.games)
	{
		gameObject["th" + itm] = settings.games[itm];
		gameObject["th" + itm + "_custom"] = settings.custom[itm];
	}
	fs.writeFile(path.join(__dirname, "patches", "games.js"), JSON.stringify(gameObject), function(err) {
		if(err)
			return handleError(err);
		else
			if(typeof _callback === "function")
				_callback();
	});
}
function getGameOnlyData(dirpath, data, gameId, _callback)
{
	var new_data = {};
	for(i in data)
	{
		if(data[i]) //avoid download error 404 files
		{
			try { //if we already downloaded it, we keep it
				fs.readFileSync(path.join(dirpath, i));
				new_data[i] = data[i]
			} catch(e) {
				if(e.code != "ENOENT")
					handleError(e);
				else //else we download only what we need
				{
					if(gameId < 10)
						gameId = "0" + gameId.replace(".", "");
					else
						gameId = gameId.replace(".", "");
					if(path.normalize(path.join(dirpath, i)).match(/th\d{2,3}/) == "th" + gameId || path.parse(path.normalize(path.join(dirpath, i))).dir == path.normalize(dirpath))
						new_data[i] = data[i];
				}
			}
		}
	}
	return new_data;
}
function checkForUpdates(patch, gameId, _callback)
{
	if(typeof patch === "undefined")
		return;
	var dirpath = path.join(__dirname, "patches", patch.repo, patch.id);
	httpHandleRequest(patch.servers, "files.js", true, function(err, data) {
		if(err)
			if(typeof _callback === "function")
				return _callback(err, null);
			else
				return handleError(err);

		data = getGameOnlyData(dirpath, data, gameId);
		fs.readFile(path.join(dirpath, "files.js"), function(err, _data) {
			if(err && err.code != "ENOENT")
				return handleError(err);
			if(!err)
			{
				try {
					var body = JSON.parse(_data);
				} catch(e) { if(typeof _callback === "function") return _callback(e, null); else return handleError(e); }
			}
			else if(err && err.code == "ENOENT")
				var body = {};

			dirTest(dirpath);
			fs.writeFile(path.join(dirpath, "files.js"), JSON.stringify(data), function(err) {
				if(err)
					if(typeof _callback === "function")
						return _callback(err, null);
					else
						return handleError(err);
			});

			if(Object.is(data, body))
			{
				if(typeof _callback === "function")
					_callback(null, null);
			}
			else
			{
				var toDownloadData = [];
				for(i in data)
					if(data[i] && (!body[i] || data[i] != body[i]))
						toDownloadData.push({repo: patch.repo, id: patch.id, file: i});
				if(typeof _callback === "function")
					_callback(null, toDownloadData);
				else
					return toDownloadData;
			}
		});
	});
}
function launchGame(gid, pro)
{
	const { spawn } = require('child_process');
	if(!pro)
		var child = spawn(settings.games[gid], [], {cwd: path.dirname(settings.games[gid])});
	else
		var child = spawn(path.join(__dirname, "patches",  "thcrap_loader.exe"), [path.join(__dirname, "patches", pro + ".js"), "th" + gid], {cwd: path.join(__dirname, "patches")});
	gameLaunched = true;
	$(".launch-game-button").removeAttr("disabled");
	$(".launch-game-button").text(individualTranslate("game-running")).attr("trid", "game-running").addClass("game-running");

	remote.getCurrentWindow().minimize();

	child.stdout.on('data', (data) => {
		console.log(`stdout: ${data}`);
	});

	child.stderr.on('data', (data) => {
		console.log(`stderr: ${data}`);
	});

	child.on('close', (code) => {
		console.log(`child process exited with code ${code}`);
		gameLaunched = false;
		$(".launch-game-button").text(individualTranslate("launch-game-button")).attr("trid", "launch-game-button").removeClass("game-running");
		remote.getCurrentWindow().restore();
	});
}
function launchConfig(gid, pro)
{
	const { spawn } = require('child_process');
	if(!pro)
		var child = spawn(settings.custom[gid], [], {cwd: path.dirname(settings.custom[gid])});
	else
		var child = spawn(path.join(__dirname, "patches",  "thcrap_loader.exe"), [path.join(__dirname, "patches", pro + ".js"), "th" + gid + "_custom"], {cwd: path.join(__dirname, "patches")});
	gameLaunched = true;
	$(".game-config-button").removeAttr("disabled");

	remote.getCurrentWindow().minimize();

	$(".game-config-button").text(individualTranslate("game-running")).attr("trid", "game-running").addClass("game-running");
	child.stdout.on('data', (data) => {
		console.log(`stdout: ${data}`);
	});

	child.stderr.on('data', (data) => {
		console.log(`stderr: ${data}`);
	});

	child.on('close', (code) => {
		console.log(`child process exited with code ${code}`);
		gameLaunched = false;
		$(".game-config-button").text(individualTranslate("game-config-button")).attr("trid", "game-config-button").removeClass("game-running");
		remote.getCurrentWindow().restore();
	});
}
