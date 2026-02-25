import { useRef, useEffect } from "preact/hooks";
import { Chart, CategoryScale, LineController, LineElement, PointElement, LinearScale, Tooltip } from "chart.js";
import type { LapEvent } from "../db";

Chart.register(CategoryScale, LineController, LineElement, PointElement, LinearScale, Tooltip);

interface Props {
  laps: LapEvent[];
}

export function LapTimeChart({ laps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Filter out holeshots (lap 0) and sort by timestamp
    const filtered = laps
      .filter((l) => l.lapNumber >= 1)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (filtered.length === 0) return;

    const labels = filtered.map((_, i) => `${i + 1}`);
    const data = filtered.map((l) => l.lapTime / 1000);

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Lap Time (s)",
            data,
            borderColor: "rgb(75, 192, 192)",
            borderWidth: 1.5,
            pointRadius: 3,
            pointBackgroundColor: "rgb(75, 192, 192)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          x: {
            type: "category",
            display: true,
            title: { display: true, text: "Lap #" },
          },
          y: {
            type: "linear",
            title: { display: true, text: "Time (s)" },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [laps]);

  return (
    <div style={{ position: "relative", width: "100%", height: "300px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
