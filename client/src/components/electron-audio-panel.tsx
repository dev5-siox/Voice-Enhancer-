import { useState, useEffect } from "react";
import { Cable, Zap, RefreshCw, Check, AlertTriangle, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useElectron } from "@/hooks/use-electron";

interface ElectronAudioPanelProps {
  isProcessing: boolean;
  currentInputDeviceId?: string;
}

export function ElectronAudioPanel({ isProcessing, currentInputDeviceId }: ElectronAudioPanelProps) {
  const {
    isElectron,
    platform,
    nativeDevices,
    isNativeRouting,
    selectedOutputDevice,
    refreshNativeDevices,
    startNativeRouting,
    stopNativeRouting,
    autoConfigureVirtualCable,
  } = useElectron();

  const [isAutoConfiguring, setIsAutoConfiguring] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<string>("");
  const [configStatus, setConfigStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (selectedOutputDevice) {
      setSelectedOutput(selectedOutputDevice);
    }
  }, [selectedOutputDevice]);

  if (!isElectron) {
    return null;
  }

  const virtualCableOutputs = nativeDevices.outputs.filter(d => d.isVirtualCable);
  const hasVirtualCable = virtualCableOutputs.length > 0;
  const platformName = platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'Mac' : 'Linux';
  const cableName = platform === 'darwin' ? 'BlackHole' : 'VB-Audio CABLE';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshNativeDevices();
    setIsRefreshing(false);
  };

  const handleAutoConfig = async () => {
    setIsAutoConfiguring(true);
    setConfigStatus("idle");
    
    const success = await autoConfigureVirtualCable();
    setConfigStatus(success ? "success" : "error");
    setIsAutoConfiguring(false);

    if (success && currentInputDeviceId) {
      const virtualOutput = nativeDevices.outputs.find(d => d.isVirtualCable);
      if (virtualOutput) {
        await startNativeRouting(currentInputDeviceId, virtualOutput.deviceId);
      }
    }
  };

  const handleStartRouting = async () => {
    if (!selectedOutput || !currentInputDeviceId) return;
    await startNativeRouting(currentInputDeviceId, selectedOutput);
  };

  const handleStopRouting = async () => {
    await stopNativeRouting();
  };

  return (
    <Card className={isNativeRouting ? "border-green-500/50" : hasVirtualCable ? "border-blue-500/50" : "border-amber-500/50"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Desktop Audio Routing
            {isNativeRouting ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">Connected</Badge>
            ) : hasVirtualCable ? (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">Ready</Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">Setup Required</Badge>
            )}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {platformName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!hasVirtualCable && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{cableName} not detected</p>
                <p className="text-xs mt-1 opacity-80">
                  Please install {cableName} to route audio to RingCentral.
                </p>
              </div>
            </div>
          )}

          {hasVirtualCable && !isNativeRouting && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm">
              <Cable className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{cableName} detected!</p>
                <p className="text-xs mt-1 opacity-80">
                  Click "Auto-Configure" to set up audio routing automatically.
                </p>
              </div>
            </div>
          )}

          {isNativeRouting && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-300 text-sm">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Audio routing active</p>
                <p className="text-xs mt-1 opacity-80">
                  Processed audio is being sent to {cableName}. RingCentral should receive your voice.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Native Output Devices</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 px-2"
                data-testid="button-refresh-devices"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <Select
              value={selectedOutput}
              onValueChange={setSelectedOutput}
            >
              <SelectTrigger data-testid="select-native-output">
                <SelectValue placeholder="Select output device" />
              </SelectTrigger>
              <SelectContent>
                {nativeDevices.outputs.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    <span className="flex items-center gap-2">
                      {device.label}
                      {device.isVirtualCable && (
                        <Badge variant="outline" className="text-xs ml-1">Virtual</Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            {hasVirtualCable && !isNativeRouting && (
              <Button
                onClick={handleAutoConfig}
                disabled={isAutoConfiguring || !isProcessing}
                className="flex-1"
                data-testid="button-auto-configure"
              >
                {isAutoConfiguring ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Configuring...
                  </>
                ) : configStatus === "success" ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Configured!
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Auto-Configure
                  </>
                )}
              </Button>
            )}

            {isNativeRouting ? (
              <Button
                onClick={handleStopRouting}
                variant="outline"
                className="flex-1"
                data-testid="button-stop-routing"
              >
                <Cable className="w-4 h-4 mr-2" />
                Stop Routing
              </Button>
            ) : (
              <Button
                onClick={handleStartRouting}
                disabled={!selectedOutput || !isProcessing}
                variant={hasVirtualCable ? "outline" : "default"}
                className="flex-1"
                data-testid="button-start-routing"
              >
                <Cable className="w-4 h-4 mr-2" />
                Start Routing
              </Button>
            )}
          </div>

          {!isProcessing && (
            <p className="text-xs text-muted-foreground text-center">
              Start audio processing first to enable routing
            </p>
          )}

          {configStatus === "error" && (
            <p className="text-xs text-destructive text-center">
              Could not auto-configure. Please select a device manually.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
