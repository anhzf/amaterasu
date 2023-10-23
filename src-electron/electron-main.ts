import windowCleanup from 'app/src-electron/window-cleanup';
import {
  app, BrowserWindow,
  ipcMain,
  Menu,
} from 'electron';
import os from 'os';
import path from 'path';

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

let mainWindow: BrowserWindow | undefined;
function createWindow() {
  /**
   * Initial window options
   */
  mainWindow ||= new BrowserWindow({
    icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
    minWidth: 1280,
    minHeight: 720,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Reload',
      click: () => mainWindow?.reload(),
    },
  ]));

  mainWindow.loadURL(process.env.APP_URL);

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined;
    windowCleanup.forEach((cleanup) => cleanup());
  });
}

app.whenReady().then(() => {
  ipcMain.on('log', (ev, ...args) => {
    console.log(...args);
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === undefined) {
    createWindow();
  }
});
