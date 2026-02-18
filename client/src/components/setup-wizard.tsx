import { useMemo, useState } from "react";
import { Check, ChevronRight, ExternalLink, HelpCircle, Volume2, Mic, Settings, AlertCircle, Circle, Cable, RefreshCw, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { AudioSettings } from "@shared/schema";
import type { OutputRouteStatus, SelfTestReport } from "@/hooks/use-audio-processor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { isRunningInElectron } from "@/hooks/use-electron";

interface SetupWizardProps {
  settings: AudioSettings;
  onSettingsChange: (settings: Partial<AudioSettings>) => void;
  isInitialized: boolean;
  isProcessing: boolean;
  inputLevel: number;
  outputLevel: number;
  devices: Array<{ deviceId: string; label: string; kind: MediaDeviceKind }>;
  outputDeviceId: string | null;
  setSinkIdSupported: boolean | null;
  isVirtualOutputEnabled: boolean;
  virtualStatus: OutputRouteStatus;
  virtualError: string | null;
  onInitialize: () => Promise<void>;
  onRefreshDevices: () => Promise<void>;
  onSetOutputDevice: (deviceId: string) => Promise<boolean>;
  onEnableOutput: (deviceId?: string) => Promise<boolean>;
  onRunSelfTest: (opts?: { outputDeviceId?: string | null }) => Promise<SelfTestReport>;
  selfTestReport: SelfTestReport | null;
  isSelfTesting: boolean;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  details: string[];
  externalLink?: { url: string; label: string };
}

const windowsSteps: SetupStep[] = [
  {
    id: "desktop-app",
    title: "Install VoxFilter Desktop App (recommended)",
    description: "Download and install the Windows .exe for reliable call-app routing",
    details: [
      "Download from GitHub Releases (VoxFilter-<version>-Windows.exe)",
      "Install and launch VoxFilter Desktop App",
      "Then continue with VB-Audio setup below"
    ],
    externalLink: { url: "https://github.com/herrychokshi-ops/VoxFilter-Downloads/releases/latest", label: "Download VoxFilter Desktop (.exe)" }
  },
  {
    id: "windows-default-devices",
    title: "Set Windows default audio devices (important)",
    description: "Keep your PC defaults on your headset/mic (not the virtual cable)",
    details: [
      "Windows Settings → System → Sound",
      "Output (Default): set to your real speakers/headset (e.g., Logi USB Headset)",
      "Input (Default): set to your real microphone/headset mic",
      "Do NOT set Windows default input/output to CABLE Input/CABLE Output"
    ],
  },
  {
    id: "install",
    title: "Install VB-Audio Virtual Cable",
    description: "Download and install the free virtual audio cable software",
    details: [
      "Download from vb-audio.com/Cable",
      "Right-click installer and 'Run as Administrator'",
      "Restart your computer after installation",
      "You'll see 'CABLE Input' and 'CABLE Output' in your audio devices"
    ],
    externalLink: { url: "https://vb-audio.com/Cable/", label: "Download VB-Audio" }
  },
  {
    id: "voxfilter-route",
    title: "Route VoxFilter output to the virtual cable",
    description: "Use VoxFilter's Output Routing (no OS default changes required)",
    details: [
      "In VoxFilter, click 'Start Audio Processing'",
      "Scroll to 'Audio Output Routing'",
      "Select 'CABLE Input (VB-Audio Virtual Cable)' as the output device",
      "Click 'Enable Audio Output' (this must succeed; watch for Blocked/Failed)",
      "Optional: Click 'Test Processed Audio (3s)' to prove the processed stream is live"
    ]
  },
  {
    id: "ringcentral",
    title: "Configure your call app",
    description: "Set your call app to use the virtual cable as microphone",
    details: [
      "Open your call app (RingCentral/Zoom/Teams/Meet/etc)",
      "Go to Settings → Audio",
      "Set Microphone to 'CABLE Output (VB-Audio Virtual Cable)'",
      "Set Speaker to your headphones (so you hear callers)",
      "Turn OFF 'Automatically adjust my mic level' and 'Remove my background noise' (let VoxFilter handle it)"
    ]
  },
  {
    id: "voicepro",
    title: "Start VoxFilter and Enable Output",
    description: "Process audio and route it to the virtual cable",
    details: [
      "In VoxFilter, select your physical microphone (headset, USB mic, etc.)",
      "Click 'Start Audio Processing'",
      "Select 'CABLE Input' in the Output Routing dropdown",
      "Click 'Enable Audio Output'",
      "Confirm 'Call app ready: YES' appears"
    ]
  },
  {
    id: "test",
    title: "Test in your call app",
    description: "Verify audio is flowing to your call app",
    details: [
      "In your call app's audio settings, run its microphone test",
      "Speak into your mic - you should see audio activity",
      "If no audio, re-check VoxFilter Output Routing status (Virtual: Active, Call app ready: YES)"
    ]
  }
];

const macSteps: SetupStep[] = [
  {
    id: "desktop-app",
    title: "Desktop app (Windows) is recommended for calls",
    description: "On macOS, use the web app + BlackHole (desktop installer distribution not set up yet)",
    details: [
      "If you're on macOS today: continue with BlackHole setup below",
      "If you're on Windows: prefer the VoxFilter Desktop App (.exe) from GitHub Releases"
    ],
    externalLink: { url: "https://github.com/herrychokshi-ops/VoxFilter-Downloads/releases/latest", label: "Open GitHub Releases" }
  },
  {
    id: "install",
    title: "Install BlackHole Virtual Audio Driver",
    description: "Download and install the free virtual audio software",
    details: [
      "Download BlackHole 2ch from existential.audio/blackhole",
      "Run the installer package",
      "Allow the extension in System Preferences → Security & Privacy if prompted",
      "You'll now have a new audio device called 'BlackHole 2ch'"
    ],
    externalLink: { url: "https://existential.audio/blackhole/", label: "Download BlackHole (free)" }
  },
  {
    id: "voxfilter-route",
    title: "Route VoxFilter output to BlackHole",
    description: "Use VoxFilter's Output Routing (no OS default changes required)",
    details: [
      "In VoxFilter, click 'Start Audio Processing'",
      "Scroll to 'Audio Output Routing'",
      "Select 'BlackHole 2ch' as the output device",
      "Click 'Enable Audio Output' (must succeed; watch for Blocked/Failed)",
      "Optional: Click 'Test Processed Audio (3s)' to prove the processed stream is live"
    ]
  },
  {
    id: "ringcentral",
    title: "Configure your call app",
    description: "Set your call app to use BlackHole as microphone",
    details: [
      "Open your call app (RingCentral/Zoom/Teams/Meet/etc)",
      "Go to Settings → Audio",
      "Set Microphone to 'BlackHole 2ch'",
      "Set Speaker to your headphones (so you hear callers)"
    ]
  },
  {
    id: "voicepro",
    title: "Start VoxFilter and Enable Output",
    description: "Process audio and route it to the virtual device",
    details: [
      "In VoxFilter, select your physical microphone",
      "Click 'Start Audio Processing'",
      "Select 'BlackHole' in the Output Routing dropdown",
      "Click 'Enable Audio Output'",
      "Confirm 'Call app ready: YES' appears"
    ]
  }
];

export function SetupWizard({
  settings,
  onSettingsChange,
  isInitialized,
  isProcessing,
  inputLevel,
  outputLevel,
  devices,
  outputDeviceId,
  setSinkIdSupported,
  isVirtualOutputEnabled,
  virtualStatus,
  virtualError,
  onInitialize,
  onRefreshDevices,
  onSetOutputDevice,
  onEnableOutput,
  onRunSelfTest,
  selfTestReport,
  isSelfTesting,
}: SetupWizardProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState<"windows" | "mac">("windows");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [isAutoConfiguring, setIsAutoConfiguring] = useState(false);
  const [autoConfigError, setAutoConfigError] = useState<string | null>(null);

  const steps = platform === "windows" ? windowsSteps : macSteps;

  const toggleStep = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  const allComplete = steps.every(step => completedSteps.has(step.id));
  const audioFlowing = isProcessing && inputLevel > 5 && outputLevel > 5;

  const outputDevices = useMemo(() => devices.filter((d) => d.kind === "audiooutput"), [devices]);

  const recommendedOutput = useMemo(() => {
    const outputs = outputDevices;
    if (platform === "windows") {
      return outputs.find((d) => /cable\s*input/i.test(d.label) || /vb-audio/i.test(d.label));
    }
    return outputs.find((d) => /blackhole/i.test(d.label));
  }, [outputDevices, platform]);

  const selectedOutputLabel = useMemo(() => {
    if (!outputDeviceId) return null;
    const match = outputDevices.find((d) => d.deviceId === outputDeviceId);
    return match?.label ?? null;
  }, [outputDeviceId, outputDevices]);

  const selectedLooksVirtual = useMemo(() => {
    const l = (selectedOutputLabel ?? "").toLowerCase();
    return l.includes("cable") || l.includes("vb-audio") || l.includes("blackhole") || l.includes("black hole");
  }, [selectedOutputLabel]);

  const callAppReady = Boolean(isVirtualOutputEnabled && selectedLooksVirtual);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-setup-wizard">
          <HelpCircle className="w-4 h-4 mr-2" />
          Call App Setup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Desktop Call App Setup Guide
          </DialogTitle>
          <DialogDescription>
            Follow these steps to route VoxFilter audio into a desktop call app (RingCentral/Zoom/Teams/Meet/etc)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button
              variant={platform === "windows" ? "default" : "outline"}
              size="sm"
              onClick={() => setPlatform("windows")}
              data-testid="button-platform-windows"
            >
              Windows
            </Button>
            <Button
              variant={platform === "mac" ? "default" : "outline"}
              size="sm"
              onClick={() => setPlatform("mac")}
              data-testid="button-platform-mac"
            >
              Mac
            </Button>
          </div>

          <Card className={audioFlowing ? "border-green-500 bg-green-500/5" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {audioFlowing ? (
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {audioFlowing ? "Audio is flowing!" : "Audio not detected"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {audioFlowing 
                        ? "VoxFilter is processing. Check your call app mic test."
                        : "Start processing and speak to verify audio flow"
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1" data-testid="text-input-level">
                    <Mic className="w-3 h-3" />
                    <span className={inputLevel > 5 ? "text-green-500" : "text-muted-foreground"}>
                      In: {Math.round(inputLevel)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1" data-testid="text-output-level">
                    <Volume2 className="w-3 h-3" />
                    <span className={outputLevel > 5 ? "text-green-500" : "text-muted-foreground"}>
                      Out: {Math.round(outputLevel)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick auto-config (detect + route to virtual cable) */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">One-click setup (recommended)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    VoxFilter should use your <span className="font-medium">physical microphone</span> as input, then route processed audio to{" "}
                    <span className="font-medium">{platform === "windows" ? "CABLE Input" : "BlackHole 2ch"}</span>. Your call app microphone should be{" "}
                    <span className="font-medium">{platform === "windows" ? "CABLE Output" : "BlackHole 2ch"}</span>.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={async () => {
                    try {
                      await onRefreshDevices();
                    } catch {
                      // ignore
                    }
                  }}
                  data-testid="button-wizard-refresh-devices"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {isRunningInElectron() && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await window.electronAPI?.app?.openSoundSettings?.();
                      } catch {
                        // ignore
                      }
                    }}
                    data-testid="button-open-windows-sound"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                    Open Windows sound settings
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const url =
                      "https://support.ringcentral.com/phone-system/voice-user/desktop-app/audio-video-settings.html";
                    if (isRunningInElectron()) {
                      await window.electronAPI?.app?.openExternal?.(url);
                    } else {
                      window.open(url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  data-testid="button-open-ringcentral-help"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-2" />
                  RingCentral audio settings help
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    setIsAutoConfiguring(true);
                    setAutoConfigError(null);
                    try {
                      // Ensure we don't accidentally use a virtual cable as VoxFilter input.
                      onSettingsChange({ inputDeviceId: undefined });

                      if (!isInitialized) {
                        await onInitialize();
                      }

                      // Best-effort: unlock device labels (some browsers hide until mic permission).
                      try {
                        const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
                        tmp.getTracks().forEach((t) => t.stop());
                      } catch {
                        // ignore; user may still proceed with manual selection
                      }

                      await onRefreshDevices();

                      // IMPORTANT: detect from the *latest* OS device list (labels can update after permission)
                      // rather than relying on stale props from a prior render.
                      const all = await navigator.mediaDevices.enumerateDevices();
                      const outputs = all
                        .filter((d) => d.kind === "audiooutput")
                        .filter((d) => d.deviceId !== "default" && d.deviceId !== "communications");

                      const wanted = platform === "windows"
                        ? outputs.find((d) =>
                            /cable\s*input/i.test(d.label) ||
                            /vb-audio/i.test(d.label) ||
                            (/cable/i.test(d.label) && /input/i.test(d.label))
                          )
                        : outputs.find((d) => /blackhole/i.test(d.label));

                      const targetId = wanted?.deviceId ?? outputDeviceId ?? null;
                      if (!targetId) {
                        setAutoConfigError(
                          platform === "windows"
                            ? "VB-Audio CABLE Input was not detected. Install VB-CABLE, then restart VoxFilter and click Refresh devices."
                            : "BlackHole was not detected. Install BlackHole, then restart VoxFilter and click Refresh devices."
                        );
                        return;
                      }

                      await onSetOutputDevice(targetId);
                      const ok = await onEnableOutput(targetId);
                      if (!ok) {
                        setAutoConfigError(
                          "Could not enable output routing. Check the 'Audio Output Routing' card for Blocked/Failed and re-try."
                        );
                      }
                    } finally {
                      setIsAutoConfiguring(false);
                    }
                  }}
                  disabled={isAutoConfiguring}
                  data-testid="button-wizard-auto-config"
                >
                  {isAutoConfiguring ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Configuring...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Auto-configure routing
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await onRunSelfTest({ outputDeviceId });
                  }}
                  disabled={isSelfTesting}
                  data-testid="button-wizard-self-test"
                >
                  <Cable className="w-4 h-4 mr-2" />
                  {isSelfTesting ? "Running self-test..." : "Run self-test (3s)"}
                </Button>
              </div>

              {autoConfigError && (
                <div className="text-xs p-3 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-200">
                  {autoConfigError}
                </div>
              )}

              {virtualError && (
                <div className="text-xs p-3 rounded-md bg-destructive/10 text-destructive">
                  {virtualError}
                </div>
              )}

              <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1">
                  <Cable className="w-3.5 h-3.5" />
                  Virtual routing: <span className="font-medium">{virtualStatus}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  setSinkId: <span className="font-medium">{setSinkIdSupported ? "supported" : "unknown/unsupported"}</span>
                </span>
                {selectedOutputLabel && (
                  <span className="inline-flex items-center gap-1">
                    Output selected: <span className="font-medium truncate">{selectedOutputLabel}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  Call app ready: <span className={`font-medium ${callAppReady ? "text-green-600 dark:text-green-400" : ""}`}>{callAppReady ? "YES" : "NO"}</span>
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <Collapsible
                key={step.id}
                open={expandedStep === step.id}
                onOpenChange={(open) => setExpandedStep(open ? step.id : null)}
              >
                <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <Checkbox
                    checked={completedSteps.has(step.id)}
                    onCheckedChange={() => toggleStep(step.id)}
                    data-testid={`checkbox-step-${step.id}`}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <CollapsibleTrigger className="w-full text-left" data-testid={`trigger-step-${step.id}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className={`font-medium text-sm ${completedSteps.has(step.id) ? "line-through text-muted-foreground" : ""}`}>
                            <span className="text-muted-foreground mr-2">{index + 1}.</span>
                            {step.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.description}
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${expandedStep === step.id ? "rotate-90" : ""}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <ul className="text-sm space-y-1.5 text-muted-foreground">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Circle className="w-1.5 h-1.5 mt-1.5 shrink-0 fill-current" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                      {step.externalLink && (
                        <a
                          href={step.externalLink.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
                          data-testid={`link-${step.id}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {step.externalLink.label}
                        </a>
                      )}
                    </CollapsibleContent>
                  </div>
                </div>
              </Collapsible>
            ))}
          </div>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-medium text-sm mb-2">Audio Flow Diagram</h4>
              <div className="text-xs font-mono text-muted-foreground space-y-1">
                <p>Your Physical Mic</p>
                <p className="text-primary">       ↓</p>
                <p>VoxFilter - processes audio</p>
                <p className="text-primary">       ↓</p>
                <p>{platform === "windows" ? "CABLE Input (VB-Audio) (virtual cable output)" : "BlackHole 2ch (virtual cable output)"}</p>
                <p className="text-primary">       ↓</p>
                <p>{platform === "windows" ? "CABLE Output (virtual mic)" : "BlackHole 2ch (virtual mic)"}</p>
                <p className="text-primary">       ↓</p>
                <p>Your Call App (RingCentral/Zoom/Teams/etc)</p>
              </div>
            </CardContent>
          </Card>

          {allComplete && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-600 dark:text-green-400" data-testid="text-setup-complete">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">
                All steps completed! Test your mic in your call app to verify.
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
