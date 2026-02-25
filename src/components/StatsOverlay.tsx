interface Props {
  flights: number;
  laps: number;
  crashes: number;
  lapTimes: number[];
}

function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  const whole = Math.floor(seconds);
  const frac = Math.round((seconds - whole) * 1000)
    .toString()
    .padStart(3, "0");
  return `${minutes}:${whole.toString().padStart(2, "0")}.${frac}`;
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 8px",
        lineHeight: 1,
        minWidth: "3rem",
      }}
    >
      <strong style={{ fontSize: "1rem", whiteSpace: "nowrap" }}>{value}</strong>
      <span
        style={{
          fontSize: "0.55rem",
          marginTop: "2px",
          color: "var(--pico-muted-color)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function StatsOverlay({ flights, laps, crashes, lapTimes }: Props) {
  const crashLapPct =
    laps > 0 ? `${Math.round((crashes / laps) * 100)}%` : "\u2014";

  let fastest = "\u2014";
  let fastest3 = "\u2014";
  let average = "\u2014";

  if (lapTimes.length > 0) {
    fastest = formatTime(Math.min(...lapTimes));
    average = formatTime(
      lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length,
    );
  }

  if (lapTimes.length >= 3) {
    let minSum = Infinity;
    for (let i = 0; i <= lapTimes.length - 3; i++) {
      const sum = lapTimes[i] + lapTimes[i + 1] + lapTimes[i + 2];
      if (sum < minSum) minSum = sum;
    }
    fastest3 = formatTime(minSum);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--pico-muted-color)",
        borderRadius: "4px",
        padding: "6px 4px",
        gap: "4px",
      }}
    >
      {/* Row 1 */}
      <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
        <StatCell value={String(flights)} label="flights" />
        <StatCell value={String(laps)} label="laps" />
        <StatCell value={String(crashes)} label="crashes" />
        <StatCell value={crashLapPct} label="crash/lap" />
      </div>
      {/* Row 2 */}
      <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
        <StatCell value={fastest} label="fastest" />
        <StatCell value={fastest3} label="fastest 3" />
        <StatCell value={average} label="average" />
      </div>
    </div>
  );
}
