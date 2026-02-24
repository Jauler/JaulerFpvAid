import { useRef, useEffect } from "preact/hooks";
import { Chart, CategoryScale, LineController, LineElement, PointElement, LinearScale, Tooltip } from "chart.js";
import type { BatterySample } from "../db";

Chart.register(CategoryScale, LineController, LineElement, PointElement, LinearScale, Tooltip);

interface Props {
  samples: BatterySample[];
}

export function BatteryChart({ samples }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const points: { t: number; voltage: number; amperage: number }[] = [];
    for (const batch of samples) {
      for (const s of batch.samples) {
        points.push(s);
      }
    }

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (points.length === 0) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: points.map((p) => (p.t / 1000).toFixed(1)),
        datasets: [
          {
            label: "Voltage (V)",
            data: points.map((p) => p.voltage / 10),
            borderColor: "rgb(75, 192, 192)",
            borderWidth: 1.5,
            pointRadius: 0,
            yAxisID: "yVoltage",
          },
          {
            label: "Current (A)",
            data: points.map((p) => p.amperage / 10),
            borderColor: "rgb(255, 99, 132)",
            borderWidth: 1.5,
            pointRadius: 0,
            yAxisID: "yCurrent",
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
            title: { display: true, text: "Time (s)" },
          },
          yVoltage: {
            type: "linear",
            position: "left",
            title: { display: true, text: "Voltage (V)" },
          },
          yCurrent: {
            type: "linear",
            position: "right",
            title: { display: true, text: "Current (A)" },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [samples]);

  return (
    <div style={{ position: "relative", width: "100%", height: "300px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
