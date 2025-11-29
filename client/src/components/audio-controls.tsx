import { Mic, MicOff, Volume2, Settings2, Sparkles, Save, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  isRecording?: boolean;
  recordingDuration?: number;
  inputLevel: number;
  outputLevel: number;
  latency: number;
  devices: AudioDevice[];
  onInitialize: () => void;
  onStop: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => Promise<Blob>;
  onDownloadRecording?: () => Promise<Blob | null>;
  getAnalyserData: () => Uint8Array | null;
  error: string | null;
}

// Group presets by category
const presetGroups = {
  "Basic": ["neutral", "deeper", "higher", "warm", "clear"],
  "Regional": ["british", "australian", "southern_us", "midwest_us", "new_york"],
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioControls({
  settings,
  onSettingsChange,
  isProcessing,
  isInitialized,
  isRecording = false,
  recordingDuration = 0,
  inputLevel,
  outputLevel,
  latency,
  devices,
  onInitialize,
  onStop,
  onStartRecording,
  onStopRecording,
  onDownloadRecording,
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

              <div className="flex gap-2">
                <Button 
                  onClick={onStop} 
                  variant="outline" 
                  className="flex-1"
                  data-testid="button-stop-processing"
                >
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop
                </Button>

                {onDownloadRecording && (
                  <>
                    {isRecording ? (
                      <Button 
                        onClick={onDownloadRecording}
                        variant="destructive"
                        className="flex-1"
                        data-testid="button-stop-recording"
                      >
                        <Circle className="w-3 h-3 mr-2 fill-current" />
                        {formatDuration(recordingDuration)}
                      </Button>
                    ) : (
                      <Button 
                        onClick={onStartRecording}
                        variant="secondary"
                        className="flex-1"
                        data-testid="button-start-recording"
                      >
                        <Circle className="w-3 h-3 mr-2 fill-current text-red-500" />
                        Record
                      </Button>
                    )}
                  </>
                )}
              </div>
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

      {/* Voice Modifier with Advanced Presets */}
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
                    formantShift: config.formantShift,
                  });
                }}
                disabled={!settings.accentModifierEnabled}
              >
                <SelectTrigger data-testid="select-accent-preset">
                  <SelectValue placeholder="Select preset" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(presetGroups).map(([group, presets]) => (
                    <div key={group}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group}</div>
                      {presets.map((key) => {
                        const config = accentPresetConfigs[key as AccentPresetType];
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex flex-col">
                              <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="text-xs text-muted-foreground">{config.description}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Pitch Adjustment</Label>
                <span className="text-sm font-mono">
                  {settings.pitchShift > 0 ? "+" : ""}{settings.pitchShift} st
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Formant Shift</Label>
                <span className="text-sm font-mono">
                  {(settings.formantShift || 0) > 0 ? "+" : ""}{settings.formantShift || 0}%
                </span>
              </div>
              <Slider
                value={[settings.formantShift || 0]}
                onValueChange={([value]) => onSettingsChange({ formantShift: value })}
                max={50}
                min={-50}
                step={5}
                disabled={!settings.accentModifierEnabled}
                data-testid="slider-formant-shift"
              />
              <p className="text-xs text-muted-foreground">
                Positive: brighter voice. Negative: warmer voice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Enhancement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Voice Enhancement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Clarity Boost</Label>
                <span className="text-sm font-mono">{settings.clarityBoost || 0}%</span>
              </div>
              <Slider
                value={[settings.clarityBoost || 0]}
                onValueChange={([value]) => onSettingsChange({ clarityBoost: value })}
                max={100}
                min={0}
                step={5}
                data-testid="slider-clarity-boost"
              />
              <p className="text-xs text-muted-foreground">
                Enhances vocal clarity for better intelligibility.
              </p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-sm">Volume Normalization</Label>
                <p className="text-xs text-muted-foreground">
                  Maintains consistent volume level
                </p>
              </div>
              <Switch
                checked={settings.volumeNormalization || false}
                onCheckedChange={(checked) => onSettingsChange({ volumeNormalization: checked })}
                data-testid="switch-volume-normalization"
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
