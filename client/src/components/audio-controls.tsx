import { Mic, MicOff, Volume2, VolumeX, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProcessingBadge } from "./processing-badge";
import { WaveformVisualizer } from "./waveform-visualizer";
import { AudioLevelMeter } from "./audio-level-meter";
import type { AudioSettings, AccentPresetType } from "@shared/schema";
import { accentPresetConfigs } from "@shared/schema";

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface AudioControlsProps {
  settings: AudioSettings;
  onSettingsChange: (settings: Partial<AudioSettings>) => void;
  isProcessing: boolean;
  isInitialized: boolean;
  inputLevel: number;
  outputLevel: number;
  latency: number;
  devices: AudioDevice[];
  onInitialize: () => void;
  onStop: () => void;
  getAnalyserData: () => Uint8Array | null;
  error: string | null;
}

export function AudioControls({
  settings,
  onSettingsChange,
  isProcessing,
  isInitialized,
  inputLevel,
  outputLevel,
  latency,
  devices,
  onInitialize,
  onStop,
  getAnalyserData,
  error,
}: AudioControlsProps) {
  const inputDevices = devices.filter((d) => d.kind === "audioinput");

  return (
    <div className="space-y-4">
      {/* Main Processing Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Audio Processing</CardTitle>
            <ProcessingBadge isActive={isProcessing} latency={latency} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {!isInitialized ? (
            <Button 
              onClick={onInitialize} 
              className="w-full"
              data-testid="button-start-processing"
            >
              <Mic className="w-4 h-4 mr-2" />
              Start Audio Processing
            </Button>
          ) : (
            <>
              <WaveformVisualizer 
                getAnalyserData={getAnalyserData} 
                isActive={isProcessing}
                height={64}
              />
              
              <div className="space-y-2">
                <AudioLevelMeter level={inputLevel} label="Input" />
                <AudioLevelMeter level={outputLevel} label="Output" />
              </div>

              <Button 
                onClick={onStop} 
                variant="outline" 
                className="w-full"
                data-testid="button-stop-processing"
              >
                <MicOff className="w-4 h-4 mr-2" />
                Stop Processing
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Noise Reduction */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Noise Reduction</CardTitle>
            <Switch
              checked={settings.noiseReductionEnabled}
              onCheckedChange={(checked) => onSettingsChange({ noiseReductionEnabled: checked })}
              data-testid="switch-noise-reduction"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Intensity</Label>
                <span className="text-sm font-mono">{settings.noiseReductionLevel}%</span>
              </div>
              <Slider
                value={[settings.noiseReductionLevel]}
                onValueChange={([value]) => onSettingsChange({ noiseReductionLevel: value })}
                max={100}
                min={0}
                step={5}
                disabled={!settings.noiseReductionEnabled}
                data-testid="slider-noise-reduction"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Reduces background noise like keyboard sounds, AC hum, and ambient noise.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Accent Modifier */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Voice Modifier</CardTitle>
            <Switch
              checked={settings.accentModifierEnabled}
              onCheckedChange={(checked) => onSettingsChange({ accentModifierEnabled: checked })}
              data-testid="switch-accent-modifier"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Preset</Label>
              <Select
                value={settings.accentPreset}
                onValueChange={(value: AccentPresetType) => {
                  const config = accentPresetConfigs[value];
                  onSettingsChange({ 
                    accentPreset: value,
                    pitchShift: config.pitchShift,
                  });
                }}
                disabled={!settings.accentModifierEnabled}
              >
                <SelectTrigger data-testid="select-accent-preset">
                  <SelectValue placeholder="Select preset" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(accentPresetConfigs).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col">
                        <span className="capitalize">{key}</span>
                        <span className="text-xs text-muted-foreground">{config.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Pitch Adjustment</Label>
                <span className="text-sm font-mono">
                  {settings.pitchShift > 0 ? "+" : ""}{settings.pitchShift} semitones
                </span>
              </div>
              <Slider
                value={[settings.pitchShift]}
                onValueChange={([value]) => onSettingsChange({ pitchShift: value })}
                max={12}
                min={-12}
                step={1}
                disabled={!settings.accentModifierEnabled}
                data-testid="slider-pitch-shift"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volume Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Input Gain</Label>
                <span className="text-sm font-mono">{settings.inputGain}%</span>
              </div>
              <Slider
                value={[settings.inputGain]}
                onValueChange={([value]) => onSettingsChange({ inputGain: value })}
                max={200}
                min={0}
                step={5}
                data-testid="slider-input-gain"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Output Gain</Label>
                <span className="text-sm font-mono">{settings.outputGain}%</span>
              </div>
              <Slider
                value={[settings.outputGain]}
                onValueChange={([value]) => onSettingsChange({ outputGain: value })}
                max={200}
                min={0}
                step={5}
                data-testid="slider-output-gain"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Selection */}
      {inputDevices.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Audio Device
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={settings.inputDeviceId || "default"}
              onValueChange={(value) => onSettingsChange({ inputDeviceId: value === "default" ? undefined : value })}
            >
              <SelectTrigger data-testid="select-input-device">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Microphone</SelectItem>
                {inputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
