import { useState, useEffect, useCallback } from 'react';

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

interface ElectronAPI {
  audio: {
    getDevices: () => Promise<AudioDevices>;
    getVirtualCableDevice: () => Promise<AudioDevice | null>;
    setOutputDevice: (deviceId: string) => Promise<boolean>;
    setAppOutputDevice?: (deviceId: string) => Promise<boolean>;
    startRouting: (inputDeviceId: string, outputDeviceId: string) => Promise<boolean>;
    stopRouting: () => Promise<boolean>;
    isRouting: () => Promise<boolean>;
  };
  app: {
    getPlatform: () => Promise<NodeJS.Platform>;
    getVersion: () => Promise<string>;
    openSoundSettings?: () => Promise<boolean>;
    openExternal?: (url: string) => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function useElectron() {
  const [isElectron, setIsElectron] = useState(false);
  const [platform, setPlatform] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [nativeDevices, setNativeDevices] = useState<AudioDevices>({ inputs: [], outputs: [] });
  const [virtualCableDevice, setVirtualCableDevice] = useState<AudioDevice | null>(null);
  const [isNativeRouting, setIsNativeRouting] = useState(false);
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string | null>(null);

  useEffect(() => {
    const checkElectron = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        setIsElectron(true);
        
        try {
          const [platformResult, versionResult] = await Promise.all([
            window.electronAPI.app.getPlatform(),
            window.electronAPI.app.getVersion(),
          ]);
          setPlatform(platformResult);
          setAppVersion(versionResult);
        } catch (error) {
          console.error('Error getting Electron info:', error);
        }
      }
    };

    checkElectron();
  }, []);

  const refreshNativeDevices = useCallback(async () => {
    if (!isElectron || !window.electronAPI) return;

    try {
      const [devices, virtualCable] = await Promise.all([
        window.electronAPI.audio.getDevices(),
        window.electronAPI.audio.getVirtualCableDevice(),
      ]);
      setNativeDevices(devices);
      setVirtualCableDevice(virtualCable);
    } catch (error) {
      console.error('Error refreshing native devices:', error);
    }
  }, [isElectron]);

  useEffect(() => {
    if (isElectron) {
      refreshNativeDevices();
    }
  }, [isElectron, refreshNativeDevices]);

  const setOutputDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    if (!isElectron || !window.electronAPI) return false;

    try {
      const success = await window.electronAPI.audio.setOutputDevice(deviceId);
      if (success) {
        setSelectedOutputDevice(deviceId);
      }
      return success;
    } catch (error) {
      console.error('Error setting output device:', error);
      return false;
    }
  }, [isElectron]);

  const startNativeRouting = useCallback(async (inputDeviceId: string, outputDeviceId: string): Promise<boolean> => {
    if (!isElectron || !window.electronAPI) return false;

    try {
      const success = await window.electronAPI.audio.startRouting(inputDeviceId, outputDeviceId);
      if (success) {
        setIsNativeRouting(true);
        setSelectedOutputDevice(outputDeviceId);
      }
      return success;
    } catch (error) {
      console.error('Error starting native routing:', error);
      return false;
    }
  }, [isElectron]);

  const stopNativeRouting = useCallback(async (): Promise<boolean> => {
    if (!isElectron || !window.electronAPI) return false;

    try {
      const success = await window.electronAPI.audio.stopRouting();
      if (success) {
        setIsNativeRouting(false);
      }
      return success;
    } catch (error) {
      console.error('Error stopping native routing:', error);
      return false;
    }
  }, [isElectron]);

  const autoConfigureVirtualCable = useCallback(async (): Promise<boolean> => {
    if (!isElectron || !window.electronAPI) return false;

    await refreshNativeDevices();

    const virtualOutput = nativeDevices.outputs.find(d => d.isVirtualCable);
    if (virtualOutput) {
      return await setOutputDevice(virtualOutput.deviceId);
    }

    return false;
  }, [isElectron, nativeDevices, refreshNativeDevices, setOutputDevice]);

  return {
    isElectron,
    platform,
    appVersion,
    nativeDevices,
    virtualCableDevice,
    isNativeRouting,
    selectedOutputDevice,
    refreshNativeDevices,
    setOutputDevice,
    startNativeRouting,
    stopNativeRouting,
    autoConfigureVirtualCable,
  };
}

export function isRunningInElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}
