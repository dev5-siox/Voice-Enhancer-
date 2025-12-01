import { Mic, MicOff, Volume2, Settings2, Sparkles, Save, Circle, Cable, AlertCircle } from "lucide-react";
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
  isOutputEnabled?: boolean;
  outputDeviceId?: string | null;
  inputLevel: number;
  outputLevel: number;
  latency: number;
  devices: AudioDevice[];
  onInitialize: () => void;
  onStop: () => void;
  onEnableOutput?: (deviceId?: string) => Promise<boolean>;
  onDisableOutput?: () => void;
  onSetOutputDevice?: (deviceId: string) => Promise<boolean>;
  onStartRecording?: () => void;
  onStopRecording?: () => Promise<Blob>;
  onDownloadRecording?: () => Promise<Blob | null>;
  getAnalyserData: () => Uint8Array | null;
  error: string | null;
}

// Group presets by category
const presetGroups = {
  "Basic": ["neutral", "deeper", "higher", "warm", "clear"],
  "American Accents": ["midwest_us", "california", "pacific_nw", "mid_atlantic", "southern_us", "texas", "new_york", "boston"],
  "International": ["british", "australian"],
  "Voice Character": ["professional", "confident", "authoritative", "friendly", "calm", "energetic"],
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
  isOutputEnabled = false,
  outputDeviceId,
  inputLevel,
  outputLevel,
  latency,
  devices,
  onInitialize,
  onStop,
  onEnableOutput,
  onDisableOutput,
  onSetOutputDevice,
  onStartRecording,
  onStopRecording,
  onDownloadRecording,
  getAnalyserData,
  error,
}: AudioControlsProps) {
  const inputDevices = devices.filter((d) => d.kind === "audioinput");
  const outputDevices = devices.filter((d) => d.kind === "audiooutput");

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
              Input Device
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

      {/* Virtual Cable Output - CRITICAL FOR RINGCENTRAL */}
      {isInitialized && onEnableOutput && onDisableOutput && (
        <Card className={isOutputEnabled ? "border-green-500/50" : "border-amber-500/50"}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Cable className="w-4 h-4" />
                Virtual Cable Output
                {isOutputEnabled ? (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">Required</Badge>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!isOutputEnabled && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Enable output to send audio to RingCentral</p>
                    <p className="text-xs mt-1 opacity-80">
                      This routes processed audio through your system. Set your system output to VB-Audio CABLE Input first.
                    </p>
                  </div>
                </div>
              )}

              {outputDevices.length > 0 && onSetOutputDevice && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Output Device</Label>
                  <Select
                    value={outputDeviceId || "default"}
                    onValueChange={(value) => {
                      if (value !== "default") {
                        onSetOutputDevice(value);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-output-device">
                      <SelectValue placeholder="Select output device" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">System Default Output</SelectItem>
                      {outputDevices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select "CABLE Input" (VB-Audio) to route to RingCentral
                  </p>
                </div>
              )}

              <Button
                onClick={() => isOutputEnabled ? onDisableOutput() : onEnableOutput()}
                variant={isOutputEnabled ? "outline" : "default"}
                className="w-full"
                data-testid="button-toggle-output"
              >
                {isOutputEnabled ? (
                  <>
                    <Cable className="w-4 h-4 mr-2" />
                    Disable Output
                  </>
                ) : (
                  <>
                    <Cable className="w-4 h-4 mr-2" />
                    Enable Output to Virtual Cable
                  </>
                )}
              </Button>

              {isOutputEnabled && (
                <div className="text-xs text-green-600 dark:text-green-400 text-center">
                  Processed audio is now playing to your system output.
                  <br />
                  Ensure VB-Audio CABLE Input is your Windows default playback device.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
