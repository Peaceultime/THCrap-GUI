# Translation
You can start translating Thcrap in a new language by copying the `blank.json` file. This
file contain all the English translations of the software.
You just have to replace the English translations by your translations. Note that every `%s` will 
be replaced, you need to keep the exact same amount to keep the logic of the translation.
Next, to add your language to the settings, you will need to edit `src/lib/frontend/SettingsPopup.js` after line 10.
Copy ```,
	{text: "English", value: "en"}
``` and edit it to your language and that's it (watch out, the comma is important).