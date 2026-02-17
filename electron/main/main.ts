import { app, BrowserWindow, ipcMain, session } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AudioDeviceManager } from '../audio/device-manager.js';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let audioManager: AudioDeviceManager | null = null;
let serverProcess: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const SERVER_PORT = 5000;

// Desktop app should not be blocked by autoplay policies.
// (We still keep explicit "Enable Audio Output" UX in the renderer as a safety gate.)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow(): void {
  // Icon is optional; this repo may not ship icon assets in dev.
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const icon = fs.existsSync(iconPath) ? iconPath : undefined;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
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

  if (isDev) {
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/public/index.html'));
  }

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

async function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '../../dist/index.cjs');
    
    console.log(`Starting server from: ${serverPath}`);
    
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(SERVER_PORT),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log('[Server]', output);
      if (output.includes('serving on port') || output.includes('listening')) {
        resolve();
      }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[Server Error]', data.toString());
    });

    serverProcess.on('error', (error) => {
      console.error('Failed to start server:', error);
      reject(error);
    });

    serverProcess.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
      serverProcess = null;
    });

    setTimeout(() => {
      resolve();
    }, 5000);
  });
}

function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
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
      console.log('Starting backend server for production...');
      await startServer();
      console.log('Server started successfully');
    } catch (error) {
      console.error('Failed to start server:', error);
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
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
