/**
 * @description Every functions must be commented to ensure full understanding of the software.
 * Note that a resolved promise can only have one argument, so if you want to return more arguments,
 * you must return an object.
 */
"use strict";
const Utils = require("../Utils");
const Constants = require("../Constants")
const path = require("path");

module.exports = class Settings
{
	static #settings = {};
	static load()
	{
		return Utils.read(path.join("data", "settings.json")).then(function(d) {
			try {
				Settings.#settings = JSON.parse(d);
			} catch(e) { return Promise.reject(e); }
			return Promise.resolve();
		}).catch(function(e) {
			if(e.code === "ENOENT")
			{
				Settings.#settings = Constants.SETTINGS;
				return Settings.save();
			}
			else
				return Promise.reject(e);
		}).catch(console.error);
	}
	static get(prop)
	{
		if(Settings.#settings[prop] === undefined && Constants.SETTINGS[prop] !== undefined)
		{
			Settings.#settings[prop] = Constants.SETTINGS[prop];
			Settings.save();
		}
		return Settings.#settings[prop];
	}
	static set(prop, val)
	{
		Settings.#settings[prop] = val;
		Settings.save();
	}
	static save()
	{
		return Utils.save(path.join("data", "settings.json"), JSON.stringify(Settings.#settings));
	}
};