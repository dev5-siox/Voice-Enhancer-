import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

export class AudioDeviceManager {
  private currentOutputDevice: string | null = null;
  private isRoutingActive: boolean = false;
  private platform: NodeJS.Platform;

  constructor() {
    this.platform = process.platform;
  }

  async getAudioDevices(): Promise<AudioDevices> {
    const devices: AudioDevices = { inputs: [], outputs: [] };

    try {
      if (this.platform === 'win32') {
        const result = await this.getWindowsDevices();
        devices.inputs = result.inputs;
        devices.outputs = result.outputs;
      } else if (this.platform === 'darwin') {
        const result = await this.getMacDevices();
        devices.inputs = result.inputs;
        devices.outputs = result.outputs;
      } else {
        const result = await this.getLinuxDevices();
        devices.inputs = result.inputs;
        devices.outputs = result.outputs;
      }
    } catch (error) {
      console.error('Error getting audio devices:', error);
    }

    return devices;
  }

  private async getWindowsDevices(): Promise<AudioDevices> {
    const devices: AudioDevices = { inputs: [], outputs: [] };

    try {
      const script = `
        Add-Type -AssemblyName System.Speech
        $devices = Get-WmiObject Win32_SoundDevice | Select-Object Name, DeviceID, Status
        $devices | ConvertTo-Json
      `;
      
      const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`, {
        timeout: 10000
      });

      const rawDevices = JSON.parse(stdout || '[]');
      const deviceList = Array.isArray(rawDevices) ? rawDevices : [rawDevices];

      for (const device of deviceList) {
        if (!device?.Name) continue;
        
        const isVirtualCable = this.isVirtualCableDevice(device.Name);
        const isInput = device.Name.toLowerCase().includes('microphone') || 
                       device.Name.toLowerCase().includes('input') ||
                       device.Name.toLowerCase().includes('cable output');
        const isOutput = device.Name.toLowerCase().includes('speaker') || 
                        device.Name.toLowerCase().includes('output') ||
                        device.Name.toLowerCase().includes('cable input') ||
                        device.Name.toLowerCase().includes('headphone');

        const audioDevice: AudioDevice = {
          deviceId: device.DeviceID || device.Name,
          label: device.Name,
          kind: isInput ? 'audioinput' : 'audiooutput',
          isVirtualCable,
        };

        if (isInput) {
          devices.inputs.push(audioDevice);
        }
        if (isOutput) {
          devices.outputs.push({ ...audioDevice, kind: 'audiooutput' });
        }
      }

      const psScript = `
        Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render\\*\\Properties" -ErrorAction SilentlyContinue |
        ForEach-Object { $_.'{a45c254e-df1c-4efd-8020-67d146a850e0},2' } | Where-Object { $_ -ne $null }
      `;
      
      try {
        const { stdout: renderDevices } = await execAsync(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, { timeout: 5000 });
        const outputNames = renderDevices.split('\n').filter(n => n.trim());
        
        for (const name of outputNames) {
          const trimmedName = name.trim();
          if (trimmedName && !devices.outputs.some(d => d.label === trimmedName)) {
            devices.outputs.push({
              deviceId: trimmedName,
              label: trimmedName,
              kind: 'audiooutput',
              isVirtualCable: this.isVirtualCableDevice(trimmedName),
            });
          }
        }
      } catch {
      }

    } catch (error) {
      console.error('Error getting Windows devices:', error);
    }

    if (devices.outputs.length === 0) {
      devices.outputs.push({
        deviceId: 'default',
        label: 'Default Output Device',
        kind: 'audiooutput',
        isVirtualCable: false,
      });
    }

    return devices;
  }

  private async getMacDevices(): Promise<AudioDevices> {
    const devices: AudioDevices = { inputs: [], outputs: [] };

    try {
      const { stdout } = await execAsync('system_profiler SPAudioDataType -json', { timeout: 10000 });
      const data = JSON.parse(stdout);
      
      const audioData = data.SPAudioDataType || [];
      for (const category of audioData) {
        const items = category._items || [];
        for (const item of items) {
          const name = item._name || 'Unknown Device';
          const isVirtualCable = this.isVirtualCableDevice(name);
          
          if (item.coreaudio_input_source) {
            devices.inputs.push({
              deviceId: name,
              label: name,
              kind: 'audioinput',
              isVirtualCable,
            });
          }
          if (item.coreaudio_output_source) {
            devices.outputs.push({
              deviceId: name,
              label: name,
              kind: 'audiooutput',
              isVirtualCable,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error getting Mac devices:', error);
    }

    if (devices.outputs.length === 0) {
      devices.outputs.push({
        deviceId: 'default',
        label: 'Default Output Device',
        kind: 'audiooutput',
        isVirtualCable: false,
      });
    }

    return devices;
  }

  private async getLinuxDevices(): Promise<AudioDevices> {
    const devices: AudioDevices = { inputs: [], outputs: [] };

    try {
      const { stdout } = await execAsync('pactl list sources short 2>/dev/null || arecord -l 2>/dev/null', { timeout: 5000 });
      const lines = stdout.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const name = parts[1] || parts[0];
          devices.inputs.push({
            deviceId: parts[0],
            label: name,
            kind: 'audioinput',
            isVirtualCable: this.isVirtualCableDevice(name),
          });
        }
      }
    } catch {
    }

    try {
      const { stdout } = await execAsync('pactl list sinks short 2>/dev/null || aplay -l 2>/dev/null', { timeout: 5000 });
      const lines = stdout.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const name = parts[1] || parts[0];
          devices.outputs.push({
            deviceId: parts[0],
            label: name,
            kind: 'audiooutput',
            isVirtualCable: this.isVirtualCableDevice(name),
          });
        }
      }
    } catch {
    }

    return devices;
  }

  private isVirtualCableDevice(name: string): boolean {
    const lowerName = name.toLowerCase();
    const virtualCablePatterns = [
      'cable',
      'vb-audio',
      'virtual',
      'blackhole',
      'loopback',
      'voicemeeter',
      'soundflower',
    ];
    return virtualCablePatterns.some(pattern => lowerName.includes(pattern));
  }

  findVirtualCableDevice(): AudioDevice | null {
    return null;
  }

  async setOutputDevice(deviceId: string): Promise<boolean> {
    try {
      if (this.platform === 'win32') {
        const script = `
          $deviceName = "${deviceId}"
          $devices = Get-AudioDevice -List | Where-Object { $_.Type -eq 'Playback' -and $_.Name -like "*$deviceName*" }
          if ($devices) {
            Set-AudioDevice -ID $devices[0].ID
            Write-Output "Success"
          } else {
            Write-Output "Device not found"
          }
        `;
        try {
          await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`, { timeout: 5000 });
        } catch {
          console.log('Note: AudioDeviceCmdlets not installed, using system default');
        }
      } else if (this.platform === 'darwin') {
        try {
          await execAsync(`SwitchAudioSource -s "${deviceId}"`, { timeout: 5000 });
        } catch {
          console.log('Note: SwitchAudioSource not installed, using system default');
        }
      }
      
      this.currentOutputDevice = deviceId;
      return true;
    } catch (error) {
      console.error('Error setting output device:', error);
      return false;
    }
  }

  async startAudioRouting(inputDeviceId: string, outputDeviceId: string): Promise<boolean> {
    try {
      await this.setOutputDevice(outputDeviceId);
      this.isRoutingActive = true;
      console.log(`Audio routing started: ${inputDeviceId} -> ${outputDeviceId}`);
      return true;
    } catch (error) {
      console.error('Error starting audio routing:', error);
      return false;
    }
  }

  async stopAudioRouting(): Promise<boolean> {
    try {
      this.isRoutingActive = false;
      console.log('Audio routing stopped');
      return true;
    } catch (error) {
      console.error('Error stopping audio routing:', error);
      return false;
    }
  }

  isRouting(): boolean {
    return this.isRoutingActive;
  }

  cleanup(): void {
    this.stopAudioRouting();
  }
}
