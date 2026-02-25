import { useRef, useEffect } from "preact/hooks";
import { Chart, CategoryScale, LineController, LineElement, PointElement, LinearScale, Tooltip } from "chart.js";
import type { SvLevelEvent } from "../db";

Chart.register(CategoryScale, LineController, LineElement, PointElement, LinearScale, Tooltip);

interface Props {
  events: SvLevelEvent[];
}

export function SpeedLevelChart({ events }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (sorted.length === 0) return;

    const labels = sorted.map((_, i) => `${i + 1}`);
    const data = sorted.map((e) => e.targetLevel);
    const pointStyles = sorted.map((e) =>
      e.trigger === "crash" ? "triangle" : e.trigger === "manual" ? "rect" : "circle",
    );
    const pointColors = sorted.map((e) =>
      e.trigger === "crash" ? "rgb(255, 99, 132)" : e.trigger === "manual" ? "rgb(255, 206, 86)" : "rgb(75, 192, 192)",
    );

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Speed Level",
            data,
            borderColor: "rgb(75, 192, 192)",
            borderWidth: 1.5,
            pointRadius: 4,
            pointBackgroundColor: pointColors,
            pointStyle: pointStyles,
            stepped: true,
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
            title: { display: true, text: "Event #" },
          },
          y: {
            type: "linear",
            min: -2,
            max: 2,
            ticks: {
              stepSize: 1,
            },
            title: { display: true, text: "Level" },
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
