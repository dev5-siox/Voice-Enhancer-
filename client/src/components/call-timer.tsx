import { useEffect, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CallTimerProps {
  isOnCall: boolean;
  startTime?: number;
  onEndCall?: () => void;
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function CallTimer({ isOnCall, startTime, onEndCall }: CallTimerProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isOnCall || !startTime) {
      setDuration(0);
      return;
    }

    const updateDuration = () => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [isOnCall, startTime]);

  if (!isOnCall) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground" data-testid="call-timer-inactive">
        <Phone className="w-4 h-4" />
        <span className="text-sm">No active call</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3" data-testid="call-timer-active">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-busy opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-busy" />
        </span>
        <span className="font-mono text-lg font-medium" data-testid="text-call-duration">
          {formatTime(duration)}
        </span>
      </div>
      {onEndCall && (
        <Button 
          size="sm" 
          variant="destructive" 
          onClick={onEndCall}
          data-testid="button-end-call"
        >
          <PhoneOff className="w-4 h-4 mr-1" />
          End
        </Button>
      )}
    </div>
  );
}
