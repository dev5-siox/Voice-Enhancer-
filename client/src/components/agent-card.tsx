import { Mic, MicOff, Volume2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { ProcessingBadge } from "./processing-badge";
import type { Agent } from "@shared/schema";

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const isOnCall = agent.status === "busy" && agent.callDuration > 0;

  return (
    <Card 
      className="hover-elevate cursor-pointer transition-colors"
      onClick={onClick}
      data-testid={`card-agent-${agent.id}`}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate" data-testid={`text-agent-name-${agent.id}`}>
                {agent.name}
              </h3>
              {agent.email && (
                <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
              )}
            </div>
            <StatusBadge status={agent.status} showLabel={false} size="sm" />
          </div>

          {/* Status indicators */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {agent.isProcessingActive ? (
                <div className="flex items-center gap-1 text-primary">
                  <Mic className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MicOff className="w-3.5 h-3.5" />
                  <span className="text-xs">Inactive</span>
                </div>
              )}
            </div>
            
            {isOnCall && (
              <span className="text-xs font-mono text-muted-foreground" data-testid={`text-call-duration-${agent.id}`}>
                {formatDuration(agent.callDuration)}
              </span>
            )}
          </div>

          {/* Feature indicators */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {agent.audioSettings.noiseReductionEnabled && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                NR
              </span>
            )}
            {agent.audioSettings.accentModifierEnabled && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                VM
              </span>
            )}
            {agent.latency > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground font-mono">
                {agent.latency}ms
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
