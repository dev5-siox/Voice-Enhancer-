interface AudioLevelMeterProps {
  level: number;
  label?: string;
  orientation?: "horizontal" | "vertical";
}

export function AudioLevelMeter({ 
  level, 
  label, 
  orientation = "horizontal" 
}: AudioLevelMeterProps) {
  const getBarColor = (barLevel: number) => {
    if (barLevel > 80) return "bg-status-busy";
    if (barLevel > 60) return "bg-status-away";
    return "bg-status-online";
  };

  if (orientation === "vertical") {
    return (
      <div className="flex flex-col items-center gap-1" data-testid="audio-level-meter-vertical">
        <div className="h-24 w-3 bg-muted rounded-full overflow-hidden flex flex-col-reverse">
          <div
            className={`w-full transition-all duration-75 rounded-full ${getBarColor(level)}`}
            style={{ height: `${level}%` }}
          />
        </div>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full" data-testid="audio-level-meter">
      {label && <span className="text-xs text-muted-foreground w-12 shrink-0">{label}</span>}
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-75 rounded-full ${getBarColor(level)}`}
          style={{ width: `${level}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">
        {Math.round(level)}%
      </span>
    </div>
  );
}
