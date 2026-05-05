const { app, BrowserWindow, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

function resolveAppHtmlPath() {
  const candidates = [
    path.join(process.resourcesPath, 'Asquarespace', 'index.html'),
    path.join(__dirname, 'Asquarespace', 'index.html'),
    path.resolve(__dirname, '..', 'Asquarespace', 'index.html')
  ];
  return candidates.find(p => fs.existsSync(p)) || candidates[candidates.length - 1];
}

function createWindow() {
  const iconPath = path.join(__dirname, 'build', 'icon.png');
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 960,
    minHeight: 640,
    title: 'Asquarespace',
    icon: iconPath,
    autoHideMenuBar: true,
    backgroundColor: '#f0f0f0',
    webPreferences: {
      contextIsolation: false,
      sandbox: false,
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: false
    }
  });

  const appHtmlPath = resolveAppHtmlPath();
  const appUrl = pathToFileURL(appHtmlPath);
  appUrl.searchParams.set('app', 'mac');
  mainWindow.loadURL(appUrl.toString());

  // YouTube requires a Chrome-like user-agent for embeds
  const currentUA = mainWindow.webContents.userAgent;
  const chromeVersion = currentUA.match(/Chrome\/([\d]+)/);
  if (chromeVersion) {
    mainWindow.webContents.setUserAgent(currentUA.replace(/\sElectron\/[\d.]+/, ''));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
