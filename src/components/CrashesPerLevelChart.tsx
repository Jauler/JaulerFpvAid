import { useRef, useEffect } from "preact/hooks";
import { Chart, CategoryScale, BarController, BarElement, LinearScale, Tooltip } from "chart.js";
import type { SvLevelEvent } from "../db";

Chart.register(CategoryScale, BarController, BarElement, LinearScale, Tooltip);

interface Props {
  events: SvLevelEvent[];
}

const LEVELS = [-2, -1, 0, 1, 2] as const;
const LEVEL_LABELS = ["-2", "-1", "0", "+1", "+2"];

export function CrashesPerLevelChart({ events }: Props) {
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

    // targetLevel in the event is post-crash; the level at crash time is +1
    const counts = new Array(LEVELS.length).fill(0);
    for (const e of crashEvents) {
      const crashLevel = e.targetLevel + 1;
      const idx = LEVELS.indexOf(crashLevel as (typeof LEVELS)[number]);
      if (idx >= 0) counts[idx]++;
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: LEVEL_LABELS,
        datasets: [
          {
            label: "Crashes",
            data: counts,
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
            title: { display: true, text: "Crashes" },
            ticks: { stepSize: 1 },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [events]);

  return (
    <div style={{ position: "relative", width: "100%", height: "300px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
