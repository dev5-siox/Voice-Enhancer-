import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
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

function parseDotEnv(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip matching quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

function loadExternalEnvIfPresent(): void {
  // Optional, "temporary" local override:
  // If a `.env` file is found next to the installed .exe (or in userData), load it.
  // Removing the file reverts behavior to defaults/in-memory storage.
  const candidates: string[] = [];
  try {
    candidates.push(path.join(path.dirname(process.execPath), '.env'));
  } catch {
    // ignore
  }
  try {
    candidates.push(path.join(app.getPath('userData'), '.env'));
  } catch {
    // ignore
  }

  for (const envPath of candidates) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const parsed = parseDotEnv(fs.readFileSync(envPath, 'utf-8'));
      for (const [k, v] of Object.entries(parsed)) {
        // Do not override env already provided by OS/shell.
        if (process.env[k] === undefined) process.env[k] = v;
      }
      console.log('VoxFilter: loaded external env', {
        path: envPath,
        keys: Object.keys(parsed).filter((k) => k !== 'DATABASE_URL'),
        hasDatabaseUrl: typeof parsed.DATABASE_URL === 'string' && parsed.DATABASE_URL.length > 0,
      });
      break;
    } catch (e) {
      console.warn('VoxFilter: failed to load external env (continuing):', { path: envPath, error: e });
    }
  }
}

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

  ipcMain.handle('app:openSoundSettings', async () => {
    try {
      if (process.platform === 'win32') {
        await shell.openExternal('ms-settings:sound');
        return true;
      }
      // Best-effort fallback: open OS sound help page.
      await shell.openExternal('https://support.microsoft.com/windows/fix-sound-problems-in-windows-73025246-b61c-40fb-671a-2535c7cd56c8');
      return true;
    } catch (error) {
      console.error('app:openSoundSettings failed:', error);
      return false;
    }
  });

  ipcMain.handle('app:openExternal', async (_event, url: string) => {
    try {
      const u = new URL(url);
      const allowed = new Set(['https:', 'http:', 'ms-settings:']);
      if (!allowed.has(u.protocol)) return false;
      await shell.openExternal(url);
      return true;
    } catch {
      return false;
    }
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

  loadExternalEnvIfPresent();

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
