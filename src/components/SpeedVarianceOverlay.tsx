import type { SpeedVarianceState, SpeedLevel } from "../scenarios/SpeedVarianceProbe";

interface Props {
  state: SpeedVarianceState;
  consecutiveLapsToLevelUp: number;
  onForceLevel?: (level: SpeedLevel) => void;
}

function levelColor(level: SpeedLevel): string {
  switch (level) {
    case 2: return "#00e676";
    case 1: return "green";
    case 0: return "var(--pico-primary)";
    case -1: return "orange";
    case -2: return "red";
  }
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

const LEVELS: SpeedLevel[] = [-2, -1, 0, 1, 2];

function WarmupPipeline({ completed, required, done }: { completed: number; required: number; done: boolean }) {
  const progress = required > 0 ? Math.min(completed / required, 1) : 0;
  const color = "var(--pico-primary)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* Start dot — always solid */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: color,
            border: `2px solid ${color}`,
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "0.7rem", color: "var(--pico-muted-color)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          warmup {completed}/{required}
        </span>
      </div>

      {/* Vertical progress line with sliding dot */}
      <div
        style={{
          width: "2px",
          height: "80px",
          backgroundColor: "var(--pico-muted-color)",
          position: "relative",
        }}
      >
        {/* Filled portion up to the dot */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: `${10 + progress * 80}%`,
            backgroundColor: color,
            transition: "height 0.3s ease",
          }}
        />
        {/* Sliding progress dot */}
        <div
          style={{
            position: "absolute",
            top: `${10 + progress * 80}%`,
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: done ? "12px" : "10px",
            height: done ? "12px" : "10px",
            borderRadius: "50%",
            backgroundColor: done ? color : "transparent",
            border: `2px solid ${color}`,
            boxShadow: done ? `0 0 6px ${color}` : undefined,
            transition: "all 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

function LevelGauge({ targetLevel, muted, boundaries }: {
  targetLevel: SpeedLevel;
  muted: boolean;
  boundaries: number[] | null;
}) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--pico-muted-color)", minWidth: "50vw" }}>
        {LEVELS.map((level) => {
          const active = !muted && level === targetLevel;
          const color = active ? levelColor(level) : "transparent";
          return (
            <div
              key={level}
              style={{
                flex: 1,
                height: "56px",
                backgroundColor: color,
                boxShadow: active ? `inset 0 0 10px rgba(255,255,255,0.2), 0 0 8px ${levelColor(level)}` : undefined,
                borderRight: level < 2 ? "1px solid var(--pico-muted-color)" : undefined,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.2s ease",
                opacity: muted ? 0.3 : 1,
              }}
            >
              <span style={{
                fontSize: "0.8rem",
                fontWeight: "bold",
                color: active ? "#fff" : "var(--pico-muted-color)",
                opacity: muted ? 0.5 : 1,
              }}>
                {level > 0 ? `+${level}` : level}
              </span>
            </div>
          );
        })}
      </div>
      {boundaries && boundaries.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${(i + 1) * 20}%`,
            top: "100%",
            transform: "translateX(-50%)",
            fontSize: "0.65rem",
            color: "var(--pico-muted-color)",
            marginTop: "2px",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {formatTime(b)}
        </div>
      ))}
    </div>
  );
}

function StreakDots({ current, total, color }: { current: number; total: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            fontSize: "0.85rem",
            color: i < current ? color : "var(--pico-muted-color)",
            lineHeight: 1,
            transition: "color 0.2s ease",
          }}
        >
          {i < current ? "◆" : "◇"}
        </span>
      ))}
    </div>
  );
}

export function SpeedVarianceOverlay({ state, consecutiveLapsToLevelUp, onForceLevel }: Props) {
  if (state.phase === "idle") return null;

  const isActive = state.phase === "active";

  return (
    <div
      style={{
        margin: "0 auto",
        padding: "0.75rem 1rem",
      }}
    >
      {/* Warmup pipeline (vertical) → level gauge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <WarmupPipeline
          completed={state.warmupLapsCompleted}
          required={state.warmupLapsRequired}
          done={isActive}
        />

        {/* Connector into gauge */}
        <div style={{ width: "2px", height: "12px", backgroundColor: isActive ? "var(--pico-primary)" : "var(--pico-muted-color)", transition: "background-color 0.2s ease" }} />
      </div>

      {/* Level gauge with +/- buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {isActive && onForceLevel ? (
          <button
            class="outline secondary"
            style={{ padding: "0.25rem 0.6rem", fontSize: "1.2rem", lineHeight: 1, margin: 0 }}
            disabled={state.targetLevel <= -2}
            onClick={() => onForceLevel((state.targetLevel - 1) as SpeedLevel)}
          >
            -
          </button>
        ) : <div style={{ width: "40px" }} />}
        <LevelGauge
          targetLevel={state.targetLevel}
          muted={!isActive}
          boundaries={isActive && state.targetLapTimes ? [
            state.targetLapTimes.levelMinus1,
            state.targetLapTimes.level0[1],
            state.targetLapTimes.level0[0],
            state.targetLapTimes.level2,
          ] : null}
        />
        {isActive && onForceLevel ? (
          <button
            class="outline secondary"
            style={{ padding: "0.25rem 0.6rem", fontSize: "1.2rem", lineHeight: 1, margin: 0 }}
            disabled={state.targetLevel >= 2}
            onClick={() => onForceLevel((state.targetLevel + 1) as SpeedLevel)}
          >
            +
          </button>
        ) : <div style={{ width: "40px" }} />}
      </div>

      {/* Streak dots + info (only when active) */}
      {isActive && (
        <div style={{ marginTop: "8px", textAlign: "center" }}>
          <StreakDots
            current={state.consecutiveOnTarget}
            total={consecutiveLapsToLevelUp}
            color={levelColor(state.targetLevel)}
          />
          <div style={{ fontSize: "0.75rem", color: "var(--pico-muted-color)", marginTop: "4px" }}>
            {state.lastLapTime != null && <>Last: {formatTime(state.lastLapTime)}</>}
            {state.lastLapTime != null && state.runningAverage > 0 && " · "}
            {state.runningAverage > 0 && <>Avg: {formatTime(state.runningAverage)}</>}
          </div>
        </div>
      )}

      {/* Connector out of gauge → end */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "2px", height: "48px", backgroundColor: "var(--pico-muted-color)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "transparent",
              border: "2px solid var(--pico-muted-color)",
            }}
          />
          <span style={{ fontSize: "0.7rem", color: "var(--pico-muted-color)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            end
          </span>
        </div>
      </div>
    </div>
  );
}
