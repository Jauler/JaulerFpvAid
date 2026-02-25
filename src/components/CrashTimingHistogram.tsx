import { useRef, useEffect } from "preact/hooks";
import { Chart, CategoryScale, BarController, BarElement, LinearScale, Tooltip } from "chart.js";

Chart.register(CategoryScale, BarController, BarElement, LinearScale, Tooltip);

interface Props {
  /** Seconds into lap at which the first crash occurred, one entry per lap that had a crash */
  crashTimings: number[];
}

const BIN_COUNT = 15;

export function CrashTimingHistogram({ crashTimings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (crashTimings.length === 0) return;

    const min = Math.min(...crashTimings);
    const max = Math.max(...crashTimings);
    const range = max - min;
    const binWidth = range > 0 ? range / BIN_COUNT : 1;

    const bins = new Array(BIN_COUNT).fill(0);
    for (const t of crashTimings) {
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
            label: "Crashes",
            data: bins,
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
            title: { display: true, text: "Time into lap (s)" },
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
  }, [crashTimings]);

  return (
    <div style={{ position: "relative", width: "100%", height: "300px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
