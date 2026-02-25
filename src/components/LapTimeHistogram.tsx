import { useRef, useEffect } from "preact/hooks";
import { Chart, CategoryScale, BarController, BarElement, LinearScale, Tooltip } from "chart.js";
import type { LapEvent } from "../db";

Chart.register(CategoryScale, BarController, BarElement, LinearScale, Tooltip);

interface Props {
  laps: LapEvent[];
}

const BIN_COUNT = 15;

export function LapTimeHistogram({ laps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const allTimes = laps
      .filter((l) => l.lapNumber >= 1)
      .map((l) => l.lapTime / 1000)
      .sort((a, b) => a - b);

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (allTimes.length === 0) return;

    // Exclude slowest 25%
    const cutoff = Math.ceil(allTimes.length * 0.75);
    const times = allTimes.slice(0, cutoff);

    const min = Math.min(...times);
    const max = Math.max(...times);
    const range = max - min;
    const binWidth = range > 0 ? range / BIN_COUNT : 1;

    const bins = new Array(BIN_COUNT).fill(0);
    for (const t of times) {
      let idx = Math.floor((t - min) / binWidth);
      if (idx >= BIN_COUNT) idx = BIN_COUNT - 1;
      bins[idx]++;
    }

    const labels = bins.map((_, i) => {
      const lo = min + i * binWidth;
      const hi = lo + binWidth;
      return `${lo.toFixed(1)}-${hi.toFixed(1)}`;
    });

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Count",
            data: bins,
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgb(75, 192, 192)",
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
            title: { display: true, text: "Lap Time (s)" },
          },
          y: {
            type: "linear",
            title: { display: true, text: "Count" },
            ticks: { stepSize: 1 },
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
