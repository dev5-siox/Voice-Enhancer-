import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioControls } from "@/components/audio-controls";
import { CustomProfiles } from "@/components/custom-profiles";
import { CallTimer } from "@/components/call-timer";
import { StatusBadge } from "@/components/status-badge";
import { useAudioProcessor } from "@/hooks/use-audio-processor";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Headphones, Info, Keyboard, User } from "lucide-react";
import { SetupWizard } from "@/components/setup-wizard";
import { apiRequest } from "@/lib/queryClient";
import type { AudioSettings, AgentStatusType, Agent } from "@shared/schema";
import { defaultAudioSettings } from "@shared/schema";
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

export default function AgentDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [agentId, setAgentId] = useState<string | null>(() => localStorage.getItem(AGENT_ID_KEY));
  const [agentName, setAgentName] = useState(() => localStorage.getItem(AGENT_NAME_KEY) || "");
  const [settings, setSettings] = useState<AudioSettings>(defaultAudioSettings);
  const [isOnCall, setIsOnCall] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | undefined>();
  const [agentStatus, setAgentStatus] = useState<AgentStatusType>("online");
  const [showSetupDialog, setShowSetupDialog] = useState(!agentId);
  const [setupName, setSetupName] = useState("");

  const audioProcessor = useAudioProcessor(settings);

  // Fetch current agent data if we have an ID
  const { data: agentData } = useQuery<Agent>({
    queryKey: ["/api/agents", agentId],
    enabled: !!agentId,
  });

  // Sync settings from server when agent data loads
  useEffect(() => {
    if (agentData) {
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
        title: "Welcome to VoicePro",
        description: `You're registered as ${agent.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
    onError: () => {
      toast({
        title: "Registration failed",
        description: "Could not register. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update agent settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { audioSettings?: Partial<AudioSettings>; status?: AgentStatusType; isProcessingActive?: boolean }) => {
      if (!agentId) throw new Error("No agent ID");
      const response = await apiRequest("PATCH", `/api/agents/${agentId}`, data);
      return (await response.json()) as Agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
  });

  const handleSettingsChange = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      // Debounced sync to server
      if (agentId) {
        updateSettingsMutation.mutate({ audioSettings: newSettings });
      }
      return updated;
    });
  }, [agentId, updateSettingsMutation]);

  const handleStartCall = useCallback(() => {
    setIsOnCall(true);
    setCallStartTime(Date.now());
    setAgentStatus("busy");
    if (agentId) {
      updateSettingsMutation.mutate({ status: "busy" });
    }
  }, [agentId, updateSettingsMutation]);

  const handleEndCall = useCallback(() => {
    setIsOnCall(false);
    setCallStartTime(undefined);
    setAgentStatus("online");
    if (agentId) {
      updateSettingsMutation.mutate({ status: "online" });
    }
  }, [agentId, updateSettingsMutation]);

  const handleInitialize = useCallback(async () => {
    await audioProcessor.initialize();
    if (agentId) {
      updateSettingsMutation.mutate({ isProcessingActive: true });
    }
  }, [audioProcessor, agentId, updateSettingsMutation]);

  const handleStop = useCallback(() => {
    audioProcessor.stop();
    if (agentId) {
      updateSettingsMutation.mutate({ isProcessingActive: false });
    }
  }, [audioProcessor, agentId, updateSettingsMutation]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome to VoicePro</DialogTitle>
            <DialogDescription>
              Enter your name to get started with audio processing for your RingCentral calls.
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
                  <p className="text-xs font-medium mb-1">How to use with RingCentral:</p>
                  <ol className="text-xs list-decimal ml-3 space-y-0.5">
                    <li>Start audio processing below to filter your mic</li>
                    <li>For full integration, use a virtual audio cable app (e.g., VB-Audio, Blackhole)</li>
                    <li>Route VoicePro output to the virtual device</li>
                    <li>Select the virtual device as your mic in RingCentral</li>
                  </ol>
                  <p className="text-xs mt-2 text-muted-foreground">
                    Browser limitations prevent direct device routing.
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
              <span>Quick tip: Start audio processing before joining your RingCentral call for best results</span>
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
          onStartRecording={audioProcessor.startRecording}
          onStopRecording={audioProcessor.stopRecording}
          onDownloadRecording={audioProcessor.downloadRecording}
          getAnalyserData={audioProcessor.getAnalyserData}
          error={audioProcessor.error}
        />

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
