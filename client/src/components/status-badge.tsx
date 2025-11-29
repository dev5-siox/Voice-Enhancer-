import { Badge } from "@/components/ui/badge";
import type { AgentStatusType } from "@shared/schema";

interface StatusBadgeProps {
  status: AgentStatusType;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const statusConfig: Record<AgentStatusType, { label: string; className: string }> = {
  online: {
    label: "Online",
    className: "bg-status-online/20 text-status-online border-status-online/30",
  },
  away: {
    label: "Away",
    className: "bg-status-away/20 text-status-away border-status-away/30",
  },
  busy: {
    label: "Busy",
    className: "bg-status-busy/20 text-status-busy border-status-busy/30",
  },
  offline: {
    label: "Offline",
    className: "bg-status-offline/20 text-status-offline border-status-offline/30",
  },
};

export function StatusBadge({ status, showLabel = true, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge
      variant="outline"
      className={`${config.className} ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"}`}
      data-testid={`badge-status-${status}`}
    >
      <span className={`inline-block rounded-full ${size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"} mr-1.5`} style={{ backgroundColor: "currentColor" }} />
      {showLabel && config.label}
    </Badge>
  );
}
