import { useRef, useEffect } from "preact/hooks";
import { Chart, CategoryScale, BarController, BarElement, LinearScale, Tooltip } from "chart.js";
import type { SvLevelEvent, LapEvent } from "../db";

Chart.register(CategoryScale, BarController, BarElement, LinearScale, Tooltip);

interface Props {
  events: SvLevelEvent[];
  laps: LapEvent[];
}

const LEVELS = [-2, -1, 0, 1, 2] as const;
const LEVEL_LABELS = ["-2", "-1", "0", "+1", "+2"];

export function CrashesPerLevelChart({ events, laps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const crashEvents = events.filter((e) => e.trigger === "crash");
    if (crashEvents.length === 0) return;

    // Count crashes per level (targetLevel is post-crash, so level at crash = +1)
    const crashes = new Array(LEVELS.length).fill(0);
    for (const e of crashEvents) {
      const crashLevel = e.targetLevel + 1;
      const idx = LEVELS.indexOf(crashLevel as (typeof LEVELS)[number]);
      if (idx >= 0) crashes[idx]++;
    }

    // Count laps per level by reconstructing which level was active for each lap
    const lapsPerLevel = new Array(LEVELS.length).fill(0);
    const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const realLaps = laps.filter((l) => l.lapNumber >= 1)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const lap of realLaps) {
      const lapTs = lap.timestamp.getTime();
      // Find the last level event at or before this lap
      let level = 0;
      for (const ev of sorted) {
        if (ev.timestamp.getTime() <= lapTs) {
          level = ev.targetLevel;
        } else {
          break;
        }
      }
      const idx = LEVELS.indexOf(level as (typeof LEVELS)[number]);
      if (idx >= 0) lapsPerLevel[idx]++;
    }

    // Crash probability = crashes / laps * 100
    const probability = LEVELS.map((_, i) =>
      lapsPerLevel[i] > 0 ? (crashes[i] / lapsPerLevel[i]) * 100 : 0,
    );

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: LEVEL_LABELS,
        datasets: [
          {
            label: "Crash probability (%)",
            data: probability,
            backgroundColor: "rgba(255, 99, 132, 0.6)",
            borderColor: "rgb(255, 99, 132)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "category",
            title: { display: true, text: "Level" },
          },
          y: {
            type: "linear",
            title: { display: true, text: "Crash probability (%)" },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [events, laps]);

  return (
    <div style={{ position: "relative", width: "100%", height: "300px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
