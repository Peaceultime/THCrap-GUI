/**
 * @description Every functions must be commented to ensure full understanding of the software.
 * Note that a resolved promise can only have one argument, so if you want to return more arguments,
 * you must return an object.
 */
"use strict";
const Utils = require("../Utils.js");
const path = require("path");

module.exports = class Translation
{
	static #lang = "";
	static #translation = {};
	static load(lang)
	{
		Translation.#lang = lang;

		return Utils.read(path.join("src", "i18n", lang + ".json")).then(function(d) {
			try {
				Translation.#translation = JSON.parse(d);
			} catch(e) { return Promise.reject(e); }
		})
	}
	static translate(id)
	{
		if(!Array.isArray(id))
			id = [id];
		for(let i in id)
		{
			if(Translation.#translation[id[i]] === undefined)
			{
				console.error("Unable to find a translation for the field id \"" + id[i] + "\"");
				id[i] = "Unknown";
				continue;
			}
			id[i] = Translation.#translation[id[i]];
		}
		if(id.length === 1)
			return id[0];
		else
			return id;
	}
	static get lang()
	{
		return Translation.#lang;
	}
};
