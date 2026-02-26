import { useRef, useEffect } from "preact/hooks";
import {
  Chart,
  CategoryScale,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Filler,
  Tooltip,
} from "chart.js";
import type { StickSample, LapEvent, HoleshotEvent, CrashEvent, SvLevelEvent } from "../db";

Chart.register(CategoryScale, LineController, LineElement, PointElement, LinearScale, Filler, Tooltip);

interface Props {
  flightStart: Date;
  stickSamples: StickSample[];
  lapEvents: LapEvent[];
  holeshotEvents: HoleshotEvent[];
  crashEvents: CrashEvent[];
  svLevelEvents: SvLevelEvent[];
}

const CRSF_MIN = 988;
const CRSF_MAX = 2012;

function crsfToPercent(value: number): number {
  return Math.max(0, Math.min(100, ((value - CRSF_MIN) / (CRSF_MAX - CRSF_MIN)) * 100));
}

type MarkerPosition = "top" | "bottom";

interface EventMarker {
  t: number;
  label: string;
  color: string;
  position: MarkerPosition;
  dashed?: boolean;
}

export function FlightTimelineChart({ flightStart, stickSamples, lapEvents, holeshotEvents, crashEvents, svLevelEvents }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    // Flatten throttle data points
    const throttlePoints: { t: number; value: number }[] = [];
    for (const batch of stickSamples) {
      for (const s of batch.samples) {
        throttlePoints.push({ t: s.t, value: crsfToPercent(s.throttle) });
      }
    }
    throttlePoints.sort((a, b) => a.t - b.t);

    if (throttlePoints.length === 0) return;

    const startMs = flightStart.getTime();

    // Build event markers
    const markers: EventMarker[] = [];

    for (const h of holeshotEvents) {
      const t = (h.timestamp.getTime() - startMs) / 1000;
      markers.push({ t, label: "Holeshot", color: "rgba(255, 206, 86, 0.9)", position: "top", dashed: true });
    }

    for (const lap of lapEvents) {
      const t = (lap.timestamp.getTime() - startMs) / 1000;
      markers.push({ t, label: `Lap ${lap.lapNumber}`, color: "rgba(75, 192, 192, 0.9)", position: "top" });
    }

    for (const crash of crashEvents) {
      const t = (crash.timestamp.getTime() - startMs) / 1000;
      markers.push({ t, label: "Crash", color: "rgba(255, 99, 132, 0.9)", position: "top" });
    }

    // Level change events — compare consecutive to detect up/down
    const sortedLevelEvents = [...svLevelEvents].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    for (let i = 1; i < sortedLevelEvents.length; i++) {
      const prev = sortedLevelEvents[i - 1];
      const ev = sortedLevelEvents[i];
      const t = (ev.timestamp.getTime() - startMs) / 1000;
      if (ev.targetLevel > prev.targetLevel) {
        markers.push({ t, label: `Lvl ${ev.targetLevel}`, color: "rgba(50, 205, 50, 0.9)", position: "bottom" });
      } else if (ev.targetLevel < prev.targetLevel) {
        markers.push({ t, label: `Lvl ${ev.targetLevel}`, color: "rgba(255, 165, 0, 0.9)", position: "bottom" });
      }
    }

    markers.sort((a, b) => a.t - b.t);

    // Time labels in seconds
    const labels = throttlePoints.map((p) => (p.t / 1000).toFixed(1));
    const timeValues = throttlePoints.map((p) => p.t / 1000);

    // Custom plugin to draw vertical event lines
    const eventLinesPlugin = {
      id: "eventLines",
      afterDraw(chart: Chart) {
        const ctx = chart.ctx;
        const xScale = chart.scales.x;
        const yScale = chart.scales.y;

        for (const marker of markers) {
          // Find the closest data index for this time
          let closestIdx = 0;
          let closestDist = Infinity;
          for (let i = 0; i < timeValues.length; i++) {
            const dist = Math.abs(timeValues[i] - marker.t);
            if (dist < closestDist) {
              closestDist = dist;
              closestIdx = i;
            }
          }

          const x = xScale.getPixelForValue(closestIdx);
          const yTop = yScale.top;
          const yBottom = yScale.bottom;

          ctx.save();
          ctx.strokeStyle = marker.color;
          ctx.lineWidth = 2;
          ctx.setLineDash(marker.dashed ? [6, 4] : []);
          ctx.beginPath();
          ctx.moveTo(x, yTop);
          ctx.lineTo(x, yBottom);
          ctx.stroke();

          // Draw label — top or bottom to avoid overlap
          ctx.fillStyle = marker.color;
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center";
          if (marker.position === "top") {
            ctx.fillText(marker.label, x, yTop - 4);
          } else {
            ctx.fillText(marker.label, x, yBottom + 12);
          }
          ctx.restore();
        }
      },
    };

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Throttle (%)",
            data: throttlePoints.map((p) => p.value),
            borderColor: "rgba(153, 102, 255, 0.7)",
            backgroundColor: "rgba(153, 102, 255, 0.15)",
            borderWidth: 1,
            pointRadius: 0,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 18, bottom: 16 },
        },
        scales: {
          x: {
            type: "category",
            display: true,
            title: { display: true, text: "Time (s)" },
          },
          y: {
            type: "linear",
            min: 0,
            max: 100,
            title: { display: true, text: "Throttle (%)" },
          },
        },
      },
      plugins: [eventLinesPlugin],
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [flightStart, stickSamples, lapEvents, holeshotEvents, crashEvents, svLevelEvents]);

  return (
    <div style={{ position: "relative", width: "100%", height: "300px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
