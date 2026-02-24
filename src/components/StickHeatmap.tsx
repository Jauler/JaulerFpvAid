import { useRef, useEffect } from "preact/hooks";
import type { StickSample } from "../db";

const SIZE = 200;
const PAD = 15;
const RANGE_MIN = 988;
const RANGE_MAX = 2012;
const BINS = 32;

function colorForNorm(norm: number): string {
  if (norm <= 0) return "transparent";
  // blue → cyan → yellow → red
  let r: number, g: number, b: number;
  if (norm < 0.33) {
    const t = norm / 0.33;
    r = 0; g = Math.round(255 * t); b = 255;
  } else if (norm < 0.66) {
    const t = (norm - 0.33) / 0.33;
    r = Math.round(255 * t); g = 255; b = Math.round(255 * (1 - t));
  } else {
    const t = (norm - 0.66) / 0.34;
    r = 255; g = Math.round(255 * (1 - t)); b = 0;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function renderHeatmap(
  canvas: HTMLCanvasElement,
  xValues: number[],
  yValues: number[],
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = SIZE;
  canvas.height = SIZE;

  const inner = SIZE - 2 * PAD;

  // Build histogram: BINS x BINS grid over the stick area
  const hist = new Uint32Array(BINS * BINS);
  let maxCount = 0;

  for (let i = 0; i < xValues.length; i++) {
    const tx = (xValues[i] - RANGE_MIN) / (RANGE_MAX - RANGE_MIN);
    const ty = (yValues[i] - RANGE_MIN) / (RANGE_MAX - RANGE_MIN);
    const bx = Math.min(BINS - 1, Math.max(0, Math.floor(tx * BINS)));
    const by = Math.min(BINS - 1, Math.max(0, Math.floor((1 - ty) * BINS))); // invert Y
    const idx = by * BINS + bx;
    hist[idx]++;
    if (hist[idx] > maxCount) maxCount = hist[idx];
  }

  // Clear canvas
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Draw filled cells
  if (maxCount > 0) {
    const cellW = inner / BINS;
    const cellH = inner / BINS;
    for (let row = 0; row < BINS; row++) {
      for (let col = 0; col < BINS; col++) {
        const count = hist[row * BINS + col];
        if (count === 0) continue;
        const norm = count / maxCount;
        ctx.fillStyle = colorForNorm(norm);
        ctx.fillRect(PAD + col * cellW, PAD + row * cellH, cellW, cellH);
      }
    }
  }

  // Draw crosshair
  ctx.strokeStyle = "rgba(128, 128, 128, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SIZE / 2, PAD);
  ctx.lineTo(SIZE / 2, SIZE - PAD);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(PAD, SIZE / 2);
  ctx.lineTo(SIZE - PAD, SIZE / 2);
  ctx.stroke();

  // Draw border
  ctx.strokeStyle = "rgba(128, 128, 128, 0.3)";
  ctx.strokeRect(0, 0, SIZE, SIZE);
}

interface Props {
  stickSamples: StickSample[];
}

export function StickHeatmap({ stickSamples }: Props) {
  const leftRef = useRef<HTMLCanvasElement>(null);
  const rightRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Flatten all samples
    const yawVals: number[] = [];
    const throttleVals: number[] = [];
    const rollVals: number[] = [];
    const pitchVals: number[] = [];

    for (const batch of stickSamples) {
      for (const s of batch.samples) {
        yawVals.push(s.yaw);
        throttleVals.push(s.throttle);
        rollVals.push(s.roll);
        pitchVals.push(s.pitch);
      }
    }

    // Left stick: yaw (x) / throttle (y) — Mode 2
    if (leftRef.current) {
      renderHeatmap(leftRef.current, yawVals, throttleVals);
    }
    // Right stick: roll (x) / pitch (y) — Mode 2
    if (rightRef.current) {
      renderHeatmap(rightRef.current, rollVals, pitchVals);
    }
  }, [stickSamples]);

  return (
    <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <canvas ref={leftRef} width={SIZE} height={SIZE} style={{ borderRadius: "4px" }} />
        <div><small>Yaw / Throttle</small></div>
      </div>
      <div style={{ textAlign: "center" }}>
        <canvas ref={rightRef} width={SIZE} height={SIZE} style={{ borderRadius: "4px" }} />
        <div><small>Roll / Pitch</small></div>
      </div>
    </div>
  );
}
