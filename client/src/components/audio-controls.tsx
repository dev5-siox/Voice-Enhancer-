import { useMemo, useState } from "react";
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
import type { OutputRouteStatus, SelfTestReport } from "@/hooks/use-audio-processor";

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
  isMonitorEnabled?: boolean;
  isVirtualOutputEnabled?: boolean;
  setSinkIdSupported?: boolean | null;
  monitorStatus?: OutputRouteStatus;
  virtualStatus?: OutputRouteStatus;
  monitorError?: string | null;
  virtualError?: string | null;
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
  onRunSelfTest?: (opts?: { outputDeviceId?: string | null }) => Promise<SelfTestReport>;
  selfTestReport?: SelfTestReport | null;
  selfTestRecordingUrl?: string | null;
  isSelfTesting?: boolean;
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
  isMonitorEnabled = false,
  isVirtualOutputEnabled = false,
  setSinkIdSupported = null,
  monitorStatus = "inactive",
  virtualStatus = "inactive",
  monitorError = null,
  virtualError = null,
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
  onRunSelfTest,
  selfTestReport,
  selfTestRecordingUrl,
  isSelfTesting = false,
  getAnalyserData,
  error,
}: AudioControlsProps) {
  const [copiedSelfTest, setCopiedSelfTest] = useState(false);

  const selfTestReportJson = useMemo(() => {
    if (!selfTestReport) return null;
    try {
      return JSON.stringify(selfTestReport, null, 2);
    } catch {
      return null;
    }
  }, [selfTestReport]);
  const inputDevices = devices.filter((d) => d.kind === "audioinput");
  const outputDevices = devices.filter((d) => d.kind === "audiooutput");
  const processingActive = isInitialized && isProcessing;
  const pitchShiftSupported = true;

  const isVirtualCableLabel = (label: string) => {
    const l = label.toLowerCase();
    return (
      l.includes("cable") ||
      l.includes("vb-audio") ||
      l.includes("blackhole") ||
      l.includes("black hole")
    );
  };

  const selectedOutputLabel =
    outputDeviceId ? outputDevices.find((d) => d.deviceId === outputDeviceId)?.label : undefined;
  const selectedLooksVirtual = selectedOutputLabel ? isVirtualCableLabel(selectedOutputLabel) : false;
  const callAppReady = Boolean(isVirtualOutputEnabled && selectedLooksVirtual);
  const anyOutputEnabled = Boolean(isMonitorEnabled || isVirtualOutputEnabled);

  const badgeForStatus = (status: OutputRouteStatus) => {
    if (status === "active") return { text: "Active", className: "bg-green-500/10 text-green-600 dark:text-green-400" };
    if (status === "blocked") return { text: "Blocked", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" };
    if (status === "failed") return { text: "Failed", className: "bg-destructive/10 text-destructive" };
    if (status === "unsupported") return { text: "Unsupported", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" };
    return { text: "Inactive", className: "bg-muted text-muted-foreground" };
  };

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

          {!processingActive && (
            <div className="p-3 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm">
              <p className="font-medium">Audio processing is OFF</p>
              <p className="text-xs mt-1 opacity-80">
                Start audio processing to hear any noise reduction / voice changes. When processing is off, your call app will hear your unprocessed mic (or nothing).
              </p>
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
              disabled={!processingActive}
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
                disabled={!processingActive || !settings.noiseReductionEnabled}
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
              disabled={!processingActive}
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
                disabled={!processingActive || !settings.accentModifierEnabled}
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
                disabled={!pitchShiftSupported || !processingActive || !settings.accentModifierEnabled}
                data-testid="slider-pitch-shift"
              />
              {!pitchShiftSupported && (
                <p className="text-xs text-muted-foreground">
                  Pitch shift is not applied in the web version yet. Use <span className="font-medium">Formant Shift</span> for audible changes.
                </p>
              )}
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
                disabled={!processingActive || !settings.accentModifierEnabled}
                data-testid="slider-formant-shift"
              />
              <p className="text-xs text-muted-foreground">
                Positive: brighter voice. Negative: warmer voice.
              </p>
              <p className="text-xs text-muted-foreground">
                Note: This is <span className="font-medium">tone/formant shaping</span>, not phoneme-level “accent conversion”.
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
              value={settings.inputDeviceId ?? "__auto__"}
              onValueChange={(value) =>
                onSettingsChange({ inputDeviceId: value === "__auto__" ? undefined : value })
              }
            >
              <SelectTrigger data-testid="select-input-device">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__">Auto-detect Physical Microphone</SelectItem>
                {inputDevices.map((device) => {
                  const isVirtual = isVirtualCableLabel(device.label);
                  return (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}{isVirtual ? " (Virtual Cable - avoid)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Select your physical microphone here. Virtual cable devices are for output only.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Virtual Cable Output - for any call app */}
      {isInitialized && onEnableOutput && onDisableOutput && (
        <Card className={anyOutputEnabled ? "border-green-500/50" : "border-amber-500/50"}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Cable className="w-4 h-4" />
                Audio Output Routing
                <Badge variant="secondary" className={badgeForStatus(virtualStatus).className}>
                  {badgeForStatus(virtualStatus).text}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {callAppReady && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-300 text-sm">
                  <Cable className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Call app routing ready</p>
                    <p className="text-xs mt-1 opacity-80">
                      VoxFilter is outputting processed audio to a virtual cable output device. In your call app (RingCentral/Zoom/Teams/etc), set the microphone to the matching virtual mic input (CABLE Output / BlackHole).
                    </p>
                  </div>
                </div>
              )}

              {!callAppReady && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Call app routing not ready</p>
                    <p className="text-xs mt-1 opacity-80">
                      Select a virtual cable output device (VB-Audio CABLE Input / BlackHole), then click Enable. If your browser blocks playback you will see “Blocked”.
                    </p>
                  </div>
                </div>
              )}

              {(virtualError || monitorError) && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm space-y-1">
                  {virtualError && <div><span className="font-medium">Virtual:</span> {virtualError}</div>}
                  {monitorError && <div><span className="font-medium">Monitor:</span> {monitorError}</div>}
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary" className={badgeForStatus(monitorStatus).className}>
                  Monitor: {badgeForStatus(monitorStatus).text}
                </Badge>
                <Badge variant="secondary" className={badgeForStatus(virtualStatus).className}>
                  Virtual: {badgeForStatus(virtualStatus).text}
                </Badge>
                <Badge
                  variant="secondary"
                  className={setSinkIdSupported ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}
                >
                  setSinkId: {setSinkIdSupported ? "Supported" : setSinkIdSupported === false ? "Unsupported" : "Unknown"}
                </Badge>
                <Badge
                  variant="secondary"
                  className={callAppReady ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}
                >
                  Call app ready: {callAppReady ? "YES" : "NO"}
                </Badge>
              </div>

              {outputDevices.length > 0 && onSetOutputDevice && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Route processed audio to:</Label>
                  <Select
                    value={outputDeviceId ?? "__system_default__"}
                    onValueChange={async (value) => {
                      await onSetOutputDevice(value);
                    }}
                  >
                    <SelectTrigger data-testid="select-output-device">
                      <SelectValue placeholder="Select output device" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__system_default__">System Default (Speakers)</SelectItem>
                      {outputDevices.map((device) => {
                        const isVirtualCable = device.label.toLowerCase().includes('cable') || 
                                               device.label.toLowerCase().includes('blackhole') ||
                                               device.label.toLowerCase().includes('vb-audio');
                        return (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            <div className="flex items-center gap-2">
                              {isVirtualCable && <Cable className="w-3 h-3 text-green-500" />}
                              <span className={isVirtualCable ? "font-medium text-green-600 dark:text-green-400" : ""}>
                                {device.label}
                              </span>
                              {isVirtualCable && <Badge variant="secondary" className="text-xs">Recommended</Badge>}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    For desktop call apps: Select "CABLE Input" (VB-Audio) or "BlackHole" as output, then set your app microphone to "CABLE Output" / "BlackHole".
                  </p>
                </div>
              )}

              <Button
                onClick={() => anyOutputEnabled ? onDisableOutput() : onEnableOutput(outputDeviceId || undefined)}
                variant={anyOutputEnabled ? "outline" : "default"}
                className="w-full"
                data-testid="button-toggle-output"
              >
                {anyOutputEnabled ? (
                  <>
                    <Cable className="w-4 h-4 mr-2" />
                    Disable Audio Output
                  </>
                ) : (
                  <>
                    <Cable className="w-4 h-4 mr-2" />
                    {outputDeviceId ? "Enable Audio Output" : "Enable Monitor (hear processed audio)"}
                  </>
                )}
              </Button>

              {onRunSelfTest && (
                <div className="pt-2 space-y-2">
                  <Button
                    onClick={() => onRunSelfTest({ outputDeviceId })}
                    variant="secondary"
                    className="w-full"
                    disabled={isSelfTesting}
                    data-testid="button-self-test"
                  >
                    {isSelfTesting ? "Running Self-Test..." : "Test Processed Audio (3s)"}
                  </Button>

                  {selfTestReport && (
                    <div className="p-3 rounded-md border bg-card text-xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">Self-Test</span>
                        <Badge
                          variant="secondary"
                          className={
                            selfTestReport.overallStatus === "ok"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : selfTestReport.overallStatus === "warn"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                : "bg-destructive/10 text-destructive"
                          }
                        >
                          {(selfTestReport.overallStatus || "fail").toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={!selfTestReportJson}
                          onClick={async () => {
                            if (!selfTestReportJson) return;
                            try {
                              await navigator.clipboard.writeText(selfTestReportJson);
                              setCopiedSelfTest(true);
                              window.setTimeout(() => setCopiedSelfTest(false), 1500);
                            } catch (e) {
                              console.error("VoxFilter: failed to copy self-test report", e);
                            }
                          }}
                        >
                          {copiedSelfTest ? "Copied" : "Copy report"}
                        </Button>
                      </div>

                      <div className="space-y-1">
                        {(selfTestReport.steps || []).map((s) => (
                          <div key={s.id} className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">{s.name}</span>
                            <span className="font-mono">
                              {(s.status || "skip").toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="text-muted-foreground space-y-0.5">
                        {selfTestReport.details?.audioContextState && (
                          <div>
                            AudioContext: {selfTestReport.details.audioContextState} @ {selfTestReport.details.sampleRate || "?"}Hz
                          </div>
                        )}
                        {(selfTestReport.details?.rawTracks !== undefined || selfTestReport.details?.processedTracks !== undefined) && (
                          <div>
                            Tracks: raw={selfTestReport.details?.rawTracks ?? "?"}, processed={selfTestReport.details?.processedTracks ?? "?"}
                          </div>
                        )}
                        {selfTestReport.details?.setSinkIdSupported !== undefined && (
                          <div>
                            setSinkIdSupported: {selfTestReport.details.setSinkIdSupported ? "true" : "false"}
                          </div>
                        )}
                        {selfTestReport.details?.selectedOutputDeviceLabel && (
                          <div>
                            Selected output: {selfTestReport.details.selectedOutputDeviceLabel}
                          </div>
                        )}
                        {(selfTestReport.details?.outputDevices?.length ?? 0) > 0 && (
                          <div>
                            Outputs detected: {selfTestReport.details?.outputDevices?.length}
                          </div>
                        )}
                        {(selfTestReport.details?.outputDevices?.length ?? 0) > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {(selfTestReport.details?.outputDevices || []).slice(0, 8).map((d) => (
                              <div key={d.deviceId} className="flex items-center justify-between gap-2">
                                <span className="truncate">{d.label}</span>
                                {d.isVirtual && (
                                  <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-300">
                                    virtual
                                  </span>
                                )}
                              </div>
                            ))}
                            {(selfTestReport.details?.outputDevices?.length || 0) > 8 && (
                              <div className="text-[10px] text-muted-foreground">
                                (showing first 8)
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {selfTestRecordingUrl && (
                        <div className="pt-2 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const a = new Audio(selfTestRecordingUrl);
                              await a.play();
                            }}
                          >
                            Play last self-test
                          </Button>
                          <a
                            className="text-xs underline text-muted-foreground self-center"
                            href={selfTestRecordingUrl}
                            download="voxfilter-selftest.webm"
                          >
                            Download
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Setup instructions */}
              <div className="mt-4 p-3 rounded-md bg-muted/50 text-xs space-y-2">
                <p className="font-medium">Setup for a call app (RingCentral/Zoom/Teams/Meet/etc):</p>
                <ol className="list-decimal ml-4 space-y-1 text-muted-foreground">
                  <li>Install VB-Audio Virtual Cable (Windows) or BlackHole (Mac)</li>
                  <li>Select "CABLE Input" in the dropdown above</li>
                  <li>In your call app, set your microphone to "CABLE Output" / "BlackHole 2ch"</li>
                  <li>Your call app will now receive your processed voice</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
