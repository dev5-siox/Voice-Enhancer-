import { Badge } from "@/components/ui/badge";

interface ProcessingBadgeProps {
  isActive: boolean;
  latency?: number;
}

export function ProcessingBadge({ isActive, latency }: ProcessingBadgeProps) {
  if (!isActive) {
    return (
      <Badge 
        variant="outline" 
        className="bg-muted/50 text-muted-foreground text-xs px-2 py-0.5"
        data-testid="badge-processing-inactive"
      >
        Inactive
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className="bg-primary/10 text-primary border-primary/30 text-xs px-2 py-0.5"
      data-testid="badge-processing-active"
    >
      <span className="relative flex h-1.5 w-1.5 mr-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
      </span>
      Active {latency !== undefined && <span className="ml-1 font-mono">&lt;{latency}ms</span>}
    </Badge>
  );
}
