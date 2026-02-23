const SIZE = 150;
const PAD = 10;
const DOT_R = 6;
const RANGE_MIN = 988;
const RANGE_MAX = 2012;

function mapChannel(value: number): number {
  const t = (value - RANGE_MIN) / (RANGE_MAX - RANGE_MIN);
  return PAD + t * (SIZE - 2 * PAD);
}

function Stick({ x, y }: { x: number; y: number }) {
  const cx = mapChannel(x);
  const cy = SIZE - mapChannel(y); // invert Y: high value = stick up

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ border: "1px solid var(--pico-muted-border-color)", borderRadius: "8px" }}
    >
      {/* crosshair */}
      <line
        x1={SIZE / 2} y1={PAD} x2={SIZE / 2} y2={SIZE - PAD}
        stroke="var(--pico-muted-border-color)" stroke-width="1"
      />
      <line
        x1={PAD} y1={SIZE / 2} x2={SIZE - PAD} y2={SIZE / 2}
        stroke="var(--pico-muted-border-color)" stroke-width="1"
      />
      {/* stick dot */}
      <circle cx={cx} cy={cy} r={DOT_R} fill="var(--pico-primary)" />
    </svg>
  );
}

interface Props {
  channels: number[];
}

export function StickOverlay({ channels }: Props) {
  // Mode 2: left = throttle(CH3)/yaw(CH4), right = pitch(CH2)/roll(CH1)
  const roll = channels[0] ?? 1500;
  const pitch = channels[1] ?? 1500;
  const throttle = channels[2] ?? 1500;
  const yaw = channels[3] ?? 1500;

  return (
    <div style={{ display: "flex", gap: "24px", justifyContent: "center" }}>
      <Stick x={yaw} y={throttle} />
      <Stick x={roll} y={pitch} />
    </div>
  );
}
