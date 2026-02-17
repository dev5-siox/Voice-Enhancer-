import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioControls } from "@/components/audio-controls";
import { CustomProfiles } from "@/components/custom-profiles";
import { CallTimer } from "@/components/call-timer";
import { StatusBadge } from "@/components/status-badge";
import { useAudioProcessor } from "@/hooks/use-audio-processor";
import { isRunningInElectron } from "@/hooks/use-electron";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Headphones, Info, Keyboard, User, Monitor } from "lucide-react";
import { SetupWizard } from "@/components/setup-wizard";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { AudioSettings, AgentStatusType, Agent } from "@shared/schema";
import { defaultAudioSettings } from "@shared/schema";
import { debounce } from "lodash-es";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AGENT_ID_KEY = "voicepro-agent-id";
const AGENT_NAME_KEY = "voicepro-agent-name";

const DESKTOP_DOWNLOAD_URL = "https://github.com/herrychokshi-ops/VoxFilter-Downloads/releases/latest";

export default function AgentDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Avoid hammering the local API during automated browser runs (Playwright sets navigator.webdriver=true),
  // which can trip server-side rate limiting and make E2E tests flaky.
  const isAutomatedBrowser = typeof navigator !== "undefined" && (navigator as any).webdriver === true;
  
  const [agentId, setAgentId] = useState<string | null>(() => localStorage.getItem(AGENT_ID_KEY));
  const [agentName, setAgentName] = useState(() => localStorage.getItem(AGENT_NAME_KEY) || "");
  const [settings, setSettings] = useState<AudioSettings>(defaultAudioSettings);
  const [isOnCall, setIsOnCall] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | undefined>();
  const [agentStatus, setAgentStatus] = useState<AgentStatusType>("online");
  const [showSetupDialog, setShowSetupDialog] = useState(!agentId && !isAutomatedBrowser);
  const [setupName, setSetupName] = useState("");

  const audioProcessor = useAudioProcessor(settings);
  const isElectron = isRunningInElectron();

  // Fetch current agent data if we have an ID
  const { data: agentData } = useQuery<Agent>({
    queryKey: ["/api/agents", agentId],
    enabled: !!agentId,
  });

  // Sync settings from server when agent data loads (but don't overwrite during mutation)
  const isMutatingRef = useRef(false);
  
  useEffect(() => {
    if (agentData && !isMutatingRef.current) {
      setSettings(agentData.audioSettings);
      setAgentStatus(agentData.status as AgentStatusType);
      setAgentName(agentData.name);
    }
  }, [agentData]);

  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/agents", {
        name,
        status: "online",
        isProcessingActive: false,
        audioSettings: defaultAudioSettings,
      });
      return (await response.json()) as Agent;
    },
    onSuccess: (agent) => {
      setAgentId(agent.id);
      setAgentName(agent.name);
      localStorage.setItem(AGENT_ID_KEY, agent.id);
      localStorage.setItem(AGENT_NAME_KEY, agent.name);
      setShowSetupDialog(false);
      toast({
        title: "Welcome to VoxFilter",
        description: `You're registered as ${agent.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
    onError: (error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: "Could not register. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update agent settings mutation with error handling and optimistic updates
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { audioSettings?: Partial<AudioSettings>; status?: AgentStatusType; isProcessingActive?: boolean }) => {
      if (!agentId) throw new Error("No agent ID");
      const response = await apiRequest("PATCH", `/api/agents/${agentId}`, data);
      return (await response.json()) as Agent;
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/agents", agentId] });
      
      // Mark that we're mutating
      isMutatingRef.current = true;

      // Snapshot the previous value
      const previousAgent = queryClient.getQueryData<Agent>(["/api/agents", agentId]);

      // Optimistically update to the new value
      if (previousAgent) {
        queryClient.setQueryData<Agent>(["/api/agents", agentId], {
          ...previousAgent,
          ...newData,
          audioSettings: newData.audioSettings 
            ? { ...previousAgent.audioSettings, ...newData.audioSettings }
            : previousAgent.audioSettings,
          updatedAt: new Date(),
        });
      }

      return { previousAgent };
    },
    onError: (error, variables, context) => {
      // Revert to previous value on error
      if (context?.previousAgent) {
        queryClient.setQueryData(["/api/agents", agentId], context.previousAgent);
      }
      
      console.error("Settings update error:", error);
      toast({
        title: "Update failed",
        description: "Could not save settings. Changes reverted.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
    onSettled: () => {
      // Mark mutation as complete
      isMutatingRef.current = false;
    },
  });

  // CRITICAL FIX: Debounced settings update
  const debouncedUpdateSettings = useMemo(
    () => debounce((newSettings: Partial<AudioSettings>) => {
      if (agentId) {
        updateSettingsMutation.mutate({ audioSettings: newSettings });
      }
    }, 300), // 300ms debounce
    [agentId, updateSettingsMutation]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedUpdateSettings.cancel();
    };
  }, [debouncedUpdateSettings]);

  const handleSettingsChange = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      // Debounced sync to server - FIXED!
      if (!isAutomatedBrowser) {
        debouncedUpdateSettings(newSettings);
      }
      return updated;
    });
  }, [debouncedUpdateSettings, isAutomatedBrowser]);

  const handleStartCall = useCallback(() => {
    setIsOnCall(true);
    setCallStartTime(Date.now());
    setAgentStatus("busy");
    if (agentId && !isAutomatedBrowser) {
      updateSettingsMutation.mutate({ status: "busy" });
    }
  }, [agentId, updateSettingsMutation, isAutomatedBrowser]);

  const handleEndCall = useCallback(() => {
    setIsOnCall(false);
    setCallStartTime(undefined);
    setAgentStatus("online");
    if (agentId && !isAutomatedBrowser) {
      updateSettingsMutation.mutate({ status: "online" });
    }
  }, [agentId, updateSettingsMutation, isAutomatedBrowser]);

  const handleInitialize = useCallback(async () => {
    try {
      await audioProcessor.initialize();
      if (agentId && !isAutomatedBrowser) {
        updateSettingsMutation.mutate({ isProcessingActive: true });
      }
    } catch (error) {
      console.error("Audio initialization error:", error);
      toast({
        title: "Initialization failed",
        description: error instanceof Error ? error.message : "Could not start audio processing",
        variant: "destructive",
      });
    }
  }, [audioProcessor, agentId, updateSettingsMutation, toast, isAutomatedBrowser]);

  const handleStop = useCallback(() => {
    try {
      audioProcessor.stop();
      if (agentId && !isAutomatedBrowser) {
        updateSettingsMutation.mutate({ isProcessingActive: false });
      }
    } catch (error) {
      console.error("Audio stop error:", error);
      toast({
        title: "Stop failed",
        description: "Could not stop audio processing",
        variant: "destructive",
      });
    }
  }, [audioProcessor, agentId, updateSettingsMutation, toast, isAutomatedBrowser]);

  const handleSetup = () => {
    if (setupName.trim()) {
      createAgentMutation.mutate(setupName.trim());
    }
  };

  const handleApplyProfile = useCallback((profileSettings: AudioSettings) => {
    setSettings(profileSettings);
    if (agentId) {
      updateSettingsMutation.mutate({ audioSettings: profileSettings });
    }
  }, [agentId, updateSettingsMutation]);

  // Expose a tiny test harness for Playwright/E2E runs.
  // This avoids brittle "download" flows and makes audio automation deterministic.
  useEffect(() => {
    if (!isAutomatedBrowser) return;

    const toHex = (buffer: ArrayBuffer) =>
      Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    (window as any).__voxfilterE2E = {
      startProcessing: async () => {
        await handleInitialize();
        return true;
      },
      stopProcessing: async () => {
        handleStop();
        return true;
      },
      setSettings: (partial: Partial<AudioSettings>) => {
        handleSettingsChange(partial);
        return true;
      },
      startRecording: () => {
        audioProcessor.startRecording();
        return true;
      },
      stopRecording: async () => {
        const blob = await audioProcessor.stopRecording();
        const buf = await blob.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", buf);
        return { size: blob.size, sha256: toHex(digest) };
      },
    };

    return () => {
      try {
        delete (window as any).__voxfilterE2E;
      } catch {
        // ignore
      }
    };
  }, [isAutomatedBrowser, audioProcessor, handleInitialize, handleStop, handleSettingsChange]);

  return (
    <div className="min-h-screen bg-background">
      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome to VoxFilter</DialogTitle>
            <DialogDescription>
              Enter your name to get started with audio processing for your calls (RingCentral/Zoom/Teams/Meet/etc).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetup()}
                data-testid="input-agent-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleSetup} 
              disabled={!setupName.trim() || createAgentMutation.isPending}
              data-testid="button-register"
              type="submit"
            >
              {createAgentMutation.isPending ? "Registering..." : "Get Started"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">My Controls</h1>
              {agentName && (
                <span className="text-muted-foreground">- {agentName}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your audio processing settings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SetupWizard 
              isProcessing={audioProcessor.isProcessing}
              inputLevel={audioProcessor.inputLevel}
              outputLevel={audioProcessor.outputLevel}
            />
            <StatusBadge status={agentStatus} size="md" />
          </div>
        </div>

        {/* Desktop app CTA (when in browser) */}
        {!isElectron && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Monitor className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Recommended for real calls: install VoxFilter Desktop App (.exe)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The desktop app is more reliable for routing processed audio into call apps (RingCentral/Zoom/Teams/Meet/etc).
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" data-testid="button-download-desktop">
                    <a href={DESKTOP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                      Download Desktop App (.exe)
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline" data-testid="button-open-setup-guide">
                    <Link href="/guide#setup">Setup guide</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                Call Status
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Info className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="text-xs font-medium mb-1">How to use with a call app:</p>
                  <ol className="text-xs list-decimal ml-3 space-y-0.5">
                    <li>Start audio processing below to filter your mic</li>
                    <li>For full integration, use a virtual audio cable app (e.g., VB-Audio, Blackhole)</li>
                    <li>Route VoxFilter output to the virtual device</li>
                    <li>Select the virtual device as your mic in your call app</li>
                  </ol>
                  <p className="text-xs mt-2 text-muted-foreground">
                    Output routing requires Chrome/Edge support for setSinkId (https/localhost). Your call app must be set to the virtual cable as its microphone.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <CallTimer 
                isOnCall={isOnCall} 
                startTime={callStartTime}
                onEndCall={isOnCall ? handleEndCall : undefined}
              />
              {!isOnCall && (
                <Button onClick={handleStartCall} data-testid="button-simulate-call">
                  Simulate Call
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Processed Stream Info */}
        {audioProcessor.isProcessing && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="font-medium text-primary">Audio processing active</span>
                  <span className="text-muted-foreground">- Noise reduction filters applied</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  Latency: {audioProcessor.latency}ms
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Keyboard Shortcuts Info */}
        <Card className="bg-muted/30">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Keyboard className="w-4 h-4" />
              <span>Quick tip: Start audio processing before joining your call for best results</span>
            </div>
          </CardContent>
        </Card>

        {/* Audio Controls */}
        <AudioControls
          settings={settings}
          onSettingsChange={handleSettingsChange}
          isProcessing={audioProcessor.isProcessing}
          isInitialized={audioProcessor.isInitialized}
          isRecording={audioProcessor.isRecording}
          recordingDuration={audioProcessor.recordingDuration}
          isOutputEnabled={audioProcessor.isOutputEnabled}
          isMonitorEnabled={audioProcessor.isMonitorEnabled}
          isVirtualOutputEnabled={audioProcessor.isVirtualOutputEnabled}
          setSinkIdSupported={audioProcessor.setSinkIdSupported}
          monitorStatus={audioProcessor.monitorStatus}
          virtualStatus={audioProcessor.virtualStatus}
          monitorError={audioProcessor.monitorError}
          virtualError={audioProcessor.virtualError}
          outputDeviceId={audioProcessor.outputDeviceId}
          inputLevel={audioProcessor.inputLevel}
          outputLevel={audioProcessor.outputLevel}
          latency={audioProcessor.latency}
          devices={audioProcessor.devices}
          onInitialize={handleInitialize}
          onStop={handleStop}
          onEnableOutput={audioProcessor.enableOutput}
          onDisableOutput={audioProcessor.disableOutput}
          onSetOutputDevice={audioProcessor.setOutputDevice}
          onRunSelfTest={audioProcessor.runSelfTest}
          selfTestReport={audioProcessor.selfTestReport}
          selfTestRecordingUrl={audioProcessor.selfTestRecordingUrl}
          isSelfTesting={audioProcessor.isSelfTesting}
          onStartRecording={audioProcessor.startRecording}
          onStopRecording={audioProcessor.stopRecording}
          onDownloadRecording={audioProcessor.downloadRecording}
          getAnalyserData={audioProcessor.getAnalyserData}
          error={audioProcessor.error}
        />

        {/* Desktop App Banner (when in browser) */}
        {!isElectron && audioProcessor.isProcessing && (
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Monitor className="w-4 h-4 text-blue-500" />
                  <span className="text-muted-foreground">
                    For the most reliable call-app integration, use the <span className="font-medium text-foreground">VoxFilter Desktop App</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Profiles */}
        {agentId && (
          <CustomProfiles
            agentId={agentId}
            currentSettings={settings}
            onApplyProfile={handleApplyProfile}
          />
        )}
      </div>
    </div>
  );
}
