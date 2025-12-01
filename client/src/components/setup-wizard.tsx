import { useState } from "react";
import { Check, ChevronRight, ExternalLink, HelpCircle, Volume2, Mic, Settings, AlertCircle, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface SetupWizardProps {
  isProcessing: boolean;
  inputLevel: number;
  outputLevel: number;
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
    id: "windows-output",
    title: "Set Windows Output to Virtual Cable",
    description: "Configure Windows to send audio through the virtual cable",
    details: [
      "Right-click speaker icon in taskbar → 'Sound settings'",
      "Under 'Output', select 'CABLE Input (VB-Audio Virtual Cable)'",
      "This routes VoicePro's processed audio through the cable",
      "Note: You won't hear other audio until you plug in headphones or revert this setting after calls"
    ]
  },
  {
    id: "ringcentral",
    title: "Configure RingCentral Desktop",
    description: "Set RingCentral to use the virtual cable as microphone",
    details: [
      "Open RingCentral desktop app",
      "Go to Settings → Audio",
      "Set Microphone to 'CABLE Output (VB-Audio Virtual Cable)'",
      "Set Speaker to your headphones (so you hear callers)"
    ]
  },
  {
    id: "voicepro",
    title: "Start VoicePro and Enable Output",
    description: "Process audio and route it to the virtual cable",
    details: [
      "In VoicePro, select your physical microphone (headset, USB mic, etc.)",
      "Click 'Start Audio Processing'",
      "Scroll down and click 'Enable Output to Virtual Cable' button (CRITICAL!)",
      "The Virtual Cable Output card should show 'Active' in green"
    ]
  },
  {
    id: "test",
    title: "Test in RingCentral",
    description: "Verify audio is flowing to RingCentral",
    details: [
      "In RingCentral Settings → Audio, click 'Test' for microphone",
      "Speak into your mic - you should see audio activity in RingCentral",
      "If no audio, make sure 'Enable Output to Virtual Cable' is clicked in VoicePro"
    ]
  }
];

const macSteps: SetupStep[] = [
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
    id: "multi-output",
    title: "Create Multi-Output Device",
    description: "Create a device that sends audio to both headphones and BlackHole",
    details: [
      "Open 'Audio MIDI Setup' (search in Spotlight)",
      "Click '+' button at bottom left → 'Create Multi-Output Device'",
      "Check BOTH 'BlackHole 2ch' AND your headphones/speakers",
      "This lets you hear audio while also routing to BlackHole"
    ]
  },
  {
    id: "mac-output",
    title: "Set Mac Output to Multi-Output Device",
    description: "Configure macOS to use the multi-output device",
    details: [
      "Go to System Preferences → Sound → Output",
      "Select the 'Multi-Output Device' you just created",
      "VoicePro output now goes to both your headphones AND BlackHole",
      "Note: Volume control may be limited with multi-output devices"
    ]
  },
  {
    id: "ringcentral",
    title: "Configure RingCentral Desktop",
    description: "Set RingCentral to use BlackHole as microphone",
    details: [
      "Open RingCentral desktop app",
      "Go to Settings → Audio",
      "Set Microphone to 'BlackHole 2ch'",
      "Set Speaker to your headphones (so you hear callers)"
    ]
  },
  {
    id: "voicepro",
    title: "Start VoicePro and Enable Output",
    description: "Process audio and route it to the virtual device",
    details: [
      "In VoicePro, select your physical microphone",
      "Click 'Start Audio Processing'",
      "Scroll down and click 'Enable Output to Virtual Cable' button (CRITICAL!)",
      "The Virtual Cable Output card should show 'Active' in green"
    ]
  }
];

export function SetupWizard({ isProcessing, inputLevel, outputLevel }: SetupWizardProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState<"windows" | "mac">("windows");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-setup-wizard">
          <HelpCircle className="w-4 h-4 mr-2" />
          RingCentral Setup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            RingCentral Desktop Setup Guide
          </DialogTitle>
          <DialogDescription>
            Follow these steps to route VoicePro audio to the RingCentral desktop app
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
                        ? "VoicePro is processing. Check RingCentral mic test."
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
                <p>VoicePro (Chrome) - processes audio</p>
                <p className="text-primary">       ↓</p>
                <p>{platform === "windows" ? "CABLE Input (VB-Audio)" : "Multi-Output Device"}</p>
                <p className="text-primary">       ↓</p>
                <p>{platform === "windows" ? "CABLE Output (virtual mic)" : "BlackHole 2ch (virtual mic)"}</p>
                <p className="text-primary">       ↓</p>
                <p>RingCentral Desktop App</p>
              </div>
            </CardContent>
          </Card>

          {allComplete && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-600 dark:text-green-400" data-testid="text-setup-complete">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">
                All steps completed! Test your mic in RingCentral to verify.
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
