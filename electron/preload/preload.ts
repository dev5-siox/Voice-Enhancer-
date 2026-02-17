import { contextBridge, ipcRenderer } from 'electron';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  isVirtualCable: boolean;
}

export interface AudioDevices {
  inputs: AudioDevice[];
  outputs: AudioDevice[];
}

export interface ElectronAPI {
  audio: {
    getDevices: () => Promise<AudioDevices>;
    getVirtualCableDevice: () => Promise<AudioDevice | null>;
    setOutputDevice: (deviceId: string) => Promise<boolean>;
    /**
     * Electron-only: route this window's audio output to a specific deviceId from
     * navigator.mediaDevices.enumerateDevices().
     */
    setAppOutputDevice: (deviceId: string) => Promise<boolean>;
    startRouting: (inputDeviceId: string, outputDeviceId: string) => Promise<boolean>;
    stopRouting: () => Promise<boolean>;
    isRouting: () => Promise<boolean>;
  };
  app: {
    getPlatform: () => Promise<NodeJS.Platform>;
    getVersion: () => Promise<string>;
  };
}

const electronAPI: ElectronAPI = {
  audio: {
    getDevices: () => ipcRenderer.invoke('audio:getDevices'),
    getVirtualCableDevice: () => ipcRenderer.invoke('audio:getVirtualCableDevice'),
    setOutputDevice: (deviceId: string) => ipcRenderer.invoke('audio:setOutputDevice', deviceId),
    setAppOutputDevice: (deviceId: string) => ipcRenderer.invoke('audio:setAppOutputDevice', deviceId),
    startRouting: (inputDeviceId: string, outputDeviceId: string) => 
      ipcRenderer.invoke('audio:startRouting', inputDeviceId, outputDeviceId),
    stopRouting: () => ipcRenderer.invoke('audio:stopRouting'),
    isRouting: () => ipcRenderer.invoke('audio:isRouting'),
  },
  app: {
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
