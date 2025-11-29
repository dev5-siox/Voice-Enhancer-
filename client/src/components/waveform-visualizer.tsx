import { useEffect, useRef, useState } from "react";

interface WaveformVisualizerProps {
  getAnalyserData: () => Uint8Array | null;
  isActive: boolean;
  barColor?: string;
  height?: number;
  barCount?: number;
}

export function WaveformVisualizer({
  getAnalyserData,
  isActive,
  barColor = "hsl(var(--primary))",
  height = 48,
  barCount = 32,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [bars, setBars] = useState<number[]>(Array(barCount).fill(0));

  useEffect(() => {
    if (!isActive) {
      setBars(Array(barCount).fill(0));
      return;
    }

    const updateBars = () => {
      const data = getAnalyserData();
      if (data) {
        const step = Math.floor(data.length / barCount);
        const newBars = Array(barCount).fill(0).map((_, i) => {
          const start = i * step;
          const end = start + step;
          let sum = 0;
          for (let j = start; j < end; j++) {
            sum += data[j];
          }
          return (sum / step / 255) * 100;
        });
        setBars(newBars);
      }
      animationRef.current = requestAnimationFrame(updateBars);
    };

    updateBars();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [getAnalyserData, isActive, barCount]);

  return (
    <div 
      className="flex items-end justify-center gap-0.5 w-full rounded-md bg-muted/30 p-2"
      style={{ height }}
      data-testid="waveform-visualizer"
    >
      {bars.map((value, index) => (
        <div
          key={index}
          className="flex-1 rounded-sm transition-all duration-75"
          style={{
            height: `${Math.max(4, value)}%`,
            backgroundColor: isActive ? barColor : "hsl(var(--muted-foreground) / 0.3)",
            minHeight: 2,
          }}
        />
      ))}
    </div>
  );
}
