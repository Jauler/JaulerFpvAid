const CELL_FULL = 4.35;
const CELL_EMPTY = 3.2;

function cellPercent(cellVoltage: number): number {
  return Math.max(0, Math.min(1, (cellVoltage - CELL_EMPTY) / (CELL_FULL - CELL_EMPTY)));
}

function percentColor(pct: number): string {
  if (pct > 0.5) return "var(--pico-primary)";
  if (pct > 0.2) return "orange";
  return "red";
}

interface Props {
  voltage: number | null; // raw value from sensor (LSB = 100 mV)
  capacityUsed: number | null; // mAh
}

export function BatteryOverlay({ voltage, capacityUsed }: Props) {
  const volts = voltage !== null ? voltage / 10 : null;
  const pct = volts !== null ? cellPercent(volts) : 0;

  // Battery icon dimensions
  const W = 36;
  const H = 18;
  const TIP_W = 4;
  const TIP_H = 8;
  const PAD = 3;
  const fillW = (W - 2 * PAD) * pct;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        border: "1px solid var(--pico-color)",
        borderRadius: "4px",
        fontSize: "1.1rem",
        lineHeight: 1,
      }}
    >
      <svg
        width={W + TIP_W}
        height={H}
        viewBox={`0 0 ${W + TIP_W} ${H}`}
      >
        {/* battery body */}
        <rect
          x={0} y={0} width={W} height={H} rx={2} ry={2}
          fill="none" stroke="var(--pico-color)" stroke-width={1.5}
        />
        {/* positive terminal tip */}
        <rect
          x={W} y={(H - TIP_H) / 2} width={TIP_W} height={TIP_H} rx={1} ry={1}
          fill="var(--pico-color)"
        />
        {/* fill level */}
        {fillW > 0 && (
          <rect
            x={PAD} y={PAD} width={fillW} height={H - 2 * PAD} rx={1} ry={1}
            fill={percentColor(pct)}
          />
        )}
      </svg>
      <span>
        {volts !== null ? `${volts.toFixed(2)}V` : "---"}
        {" / "}
        {capacityUsed !== null ? `${capacityUsed}mAh` : "---"}
      </span>
    </div>
  );
}
