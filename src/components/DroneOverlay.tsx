import type { DroneArmState } from "../probes/ArmedProbe";

interface Props {
  armState: DroneArmState;
}

const VB = 120;
const CX = VB / 2;
const CY = VB / 2;
// Crop viewBox to the used area (center 60 ± 44, plus 2px margin)
const CROP = 14;
const CROP_SIZE = VB - 2 * CROP;
const ICON_SIZE = 36;

// Arm positions relative to center (front-left, front-right, back-left, back-right)
const ARMS = [
  { x: -28, y: -28 },
  { x: 28, y: -28 },
  { x: -28, y: 28 },
  { x: 28, y: 28 },
];

const PROP_R = 16;

function stateColor(state: DroneArmState): string {
  switch (state) {
    case "off":
      return "var(--pico-muted-color)";
    case "disarmed":
      return "var(--pico-primary)";
    case "armed":
      return "green";
    case "turtle":
      return "orange";
  }
}

function Propeller({ cx, cy, spinning }: { cx: number; cy: number; spinning: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={PROP_R} fill="none" stroke="var(--pico-muted-color)" stroke-width="0.5" opacity={0.4} />
      {spinning ? (
        <circle cx={cx} cy={cy} r={PROP_R - 2} fill="var(--pico-muted-color)" opacity={0.15}>
          <animate attributeName="opacity" values="0.1;0.25;0.1" dur="0.3s" repeatCount="indefinite" />
        </circle>
      ) : (
        <g>
          <ellipse cx={cx} cy={cy} rx={PROP_R - 2} ry={2.5} fill="var(--pico-muted-color)" opacity={0.5} />
          <ellipse cx={cx} cy={cy} rx={2.5} ry={PROP_R - 2} fill="var(--pico-muted-color)" opacity={0.5} />
        </g>
      )}
      <circle cx={cx} cy={cy} r={3} fill="var(--pico-muted-color)" opacity={0.6} />
    </g>
  );
}

export function DroneOverlay({ armState }: Props) {
  const color = stateColor(armState);
  const spinning = armState === "armed" || armState === "turtle";
  const turtled = armState === "turtle";

  return (
    <div
      class={armState === "off" ? "stale-blink" : ""}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 12px",
        border: "1px solid var(--pico-muted-color)",
        borderRadius: "4px",
        lineHeight: 1,
      }}
    >
      <svg
        width={ICON_SIZE}
        height={ICON_SIZE}
        viewBox={`${CROP} ${CROP} ${CROP_SIZE} ${CROP_SIZE}`}
        style={turtled ? { transform: "rotate(180deg)" } : undefined}
      >
        {ARMS.map((a, i) => (
          <line
            key={i}
            x1={CX} y1={CY}
            x2={CX + a.x} y2={CY + a.y}
            stroke={color} stroke-width="5" stroke-linecap="round"
          />
        ))}
        <ellipse cx={CX} cy={CY} rx={10} ry={14} fill={color} opacity={0.9} />
        <circle cx={CX} cy={CY - 10} r={3} fill={color} />
        {ARMS.map((a, i) => (
          <Propeller key={i} cx={CX + a.x} cy={CY + a.y} spinning={spinning} />
        ))}
      </svg>
      <span style={{ color, fontWeight: "bold", textTransform: "uppercase", fontSize: "1.1rem", letterSpacing: "0.05em" }}>
        {armState}
      </span>
    </div>
  );
}
