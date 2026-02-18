import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AudioDeviceManager } from '../audio/device-manager.js';
import * as fs from 'fs';
import { createRequire } from 'module';
import * as net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);

let mainWindow: BrowserWindow | null = null;
let audioManager: AudioDeviceManager | null = null;
let serverStarted = false;
let serverPort: number | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const SERVER_PORT = 5000;
const SERVER_HOST = '127.0.0.1';

// Desktop app should not be blocked by autoplay policies.
// (We still keep explicit "Enable Audio Output" UX in the renderer as a safety gate.)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow(baseUrl: string): void {
  // Icon is optional; this repo may not ship icon assets in dev.
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const icon = fs.existsSync(iconPath) ? iconPath : undefined;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      // IMPORTANT: preload must be CommonJS (preload.cjs) even when the app uses ESM ("type": "module").
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    icon,
    title: 'VoxFilter - Audio Processing for Sales Teams',
    backgroundColor: '#0a0a0a',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.loadURL(baseUrl);
  if (isDev) mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
    audioManager?.cleanup();
  });

  audioManager = new AudioDeviceManager();
  setupIpcHandlers();
}

function setupIpcHandlers(): void {
  ipcMain.handle('audio:getDevices', async () => {
    return audioManager?.getAudioDevices() ?? { inputs: [], outputs: [] };
  });

  ipcMain.handle('audio:getVirtualCableDevice', async () => {
    return audioManager?.findVirtualCableDevice() ?? null;
  });

  ipcMain.handle('audio:setOutputDevice', async (_event, deviceId: string) => {
    return audioManager?.setOutputDevice(deviceId) ?? false;
  });

  // Electron-native output routing (real pipeline): route this window's audio output to a selected deviceId.
  ipcMain.handle('audio:setAppOutputDevice', async (_event, deviceId: string) => {
    if (!mainWindow) return false;
    try {
      const wc: any = mainWindow.webContents as any;
      if (typeof wc?.setAudioOutputDevice !== 'function') return false;
      await wc.setAudioOutputDevice(deviceId);
      return true;
    } catch (error) {
      console.error('Failed to set app audio output device:', { deviceId, error });
      return false;
    }
  });

  ipcMain.handle('audio:startRouting', async (_event, inputDeviceId: string, outputDeviceId: string) => {
    return audioManager?.startAudioRouting(inputDeviceId, outputDeviceId) ?? false;
  });

  ipcMain.handle('audio:stopRouting', async () => {
    return audioManager?.stopAudioRouting() ?? false;
  });

  ipcMain.handle('audio:isRouting', async () => {
    return audioManager?.isRouting() ?? false;
  });

  ipcMain.handle('app:getPlatform', async () => {
    return process.platform;
  });

  ipcMain.handle('app:getVersion', async () => {
    return app.getVersion();
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAvailablePort(preferredPort: number): Promise<number> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', () => {
      srv.listen(0, SERVER_HOST);
    });
    srv.listen(preferredPort, SERVER_HOST);
    srv.on('listening', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : preferredPort;
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServerReady(url: string, maxAttempts = 60): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch {
      // ignore until ready
    }
    await sleep(500);
  }
  return false;
}

async function startServer(): Promise<{ port: number }> {
  if (serverStarted && serverPort) return { port: serverPort };

  const port = await getAvailablePort(SERVER_PORT);
  serverPort = port;

  // Run the bundled server inside the Electron process.
  // This avoids requiring an external `node` install and works with `app.asar` paths.
  process.env.NODE_ENV = 'production';
  process.env.PORT = String(port);
  process.env.HOST = SERVER_HOST;

  const appPath = app.getAppPath(); // typically .../resources/app.asar
  const serverEntry = path.join(appPath, 'dist', 'index.cjs');

  console.log('VoxFilter: starting embedded server', { serverEntry, host: SERVER_HOST, port });

  try {
    require(serverEntry);
  } catch (error) {
    console.error('VoxFilter: failed to require embedded server', { serverEntry, error });
    throw error;
  }

  const ok = await waitForServerReady(`http://${SERVER_HOST}:${port}`);
  if (!ok) {
    throw new Error(`Embedded server not ready on http://${SERVER_HOST}:${port}`);
  }

  serverStarted = true;
  console.log('VoxFilter: embedded server ready', { host: SERVER_HOST, port });
  return { port };
}

function stopServer(): void {
  try {
    const srv = (globalThis as any).__voxfilterHttpServer;
    if (srv && typeof srv.close === 'function') srv.close();
  } catch {
    // ignore
  }
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'audioCapture'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  if (!isDev) {
    try {
      console.log('VoxFilter: starting embedded server for production...');
      const { port } = await startServer();
      console.log('VoxFilter: embedded server started successfully', { port });
    } catch (error) {
      console.error('VoxFilter: failed to start embedded server:', error);
    }
  }

  const url = isDev
    ? 'http://localhost:5000'
    : `http://${SERVER_HOST}:${serverPort ?? SERVER_PORT}`;
  createWindow(url);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(url);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  audioManager?.cleanup();
  stopServer();
});
