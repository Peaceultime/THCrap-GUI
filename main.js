const {app, BrowserWindow, remote} = require('electron');

const path = require('path');
const url = require('url');

let second;
let win;

function createWindow()
{
	if(!second)
	{
	    win = new BrowserWindow({frame: false, height: 420, width: 300, fullscreenable: false, resizable: false});
	    win.loadURL(url.format({
	    	pathname: path.join(__dirname, 'index.html'),
	    	protocol: 'file:',
	    	slashes: true
	    }));

	    win.on('closed', () => { win = null; });
	}
}

second = app.makeSingleInstance(function() {
	if(win)
	{
		if(remote.getCurrentWindow().isMinimized())
			remote.getCurrentWindow().restore();
		remote.getCurrentWindow().focus();
	}
});

if(second)
	app.quit();

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
       app.quit();
});

app.on('activate', () => {
    if (win === null)
       createWindow();
});