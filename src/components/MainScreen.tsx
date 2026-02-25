import { useState, useEffect } from "preact/hooks";
import type { RhState } from "../services/RotorhazardService";
import type { RotorhazardService } from "../services/RotorhazardService";
import type { ElrsState } from "../services/ElrsService";
import type { TelemetryService } from "../services/TelemetryService";
import type { ArmedProbe } from "../probes/ArmedProbe";
import type { FlightProbe, FlightState } from "../probes/FlightProbe";
import { useService, useServiceThrottled } from "../hooks/useService";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db } from "../db";
import { StickOverlay } from "./StickOverlay";
import { BatteryOverlay } from "./BatteryOverlay";
import { DroneOverlay } from "./DroneOverlay";
import { StatsOverlay } from "./StatsOverlay";

interface Props {
  rhState: RhState;
  rh: RotorhazardService;
  elrsState: ElrsState;
  telemetry: TelemetryService;
  armedProbe: ArmedProbe;
  flightProbe: FlightProbe;
  sessionId: number | null;
  onStop: () => void;
  onOpenSettings: () => void;
  onOpenReview: () => void;
}

const dotStyle = (color: string) => ({
  display: "inline-block",
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  backgroundColor: color,
  marginRight: "4px",
});

function rhDotColor(status: RhState["status"]): string {
  switch (status) {
    case "connected":
      return "green";
    case "connecting":
    case "reconnecting":
      return "orange";
    case "error":
      return "red";
    default:
      return "grey";
  }
}

function elrsDotColor(status: ElrsState["status"]): string {
  switch (status) {
    case "connected":
      return "green";
    case "lost":
      return "orange";
    case "unsupported":
      return "red";
    default:
      return "grey";
  }
}

const MAIN_PHASES: FlightState[] = ["off", "prepare", "flying", "landed"];

function phaseColor(phase: FlightState, active: boolean): string {
  if (!active) return "var(--pico-muted-color)";
  switch (phase) {
    case "off": return "var(--pico-muted-color)";
    case "prepare": return "var(--pico-primary)";
    case "flying": return "green";
    case "landed": return "var(--pico-primary)";
    case "crashed": return "red";
  }
}

function PhaseNode({ phase, active }: { phase: FlightState; active: boolean }) {
  const color = phaseColor(phase, active);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <div
        style={{
          width: active ? "14px" : "10px",
          height: active ? "14px" : "10px",
          borderRadius: "50%",
          backgroundColor: active ? color : "transparent",
          border: `2px solid ${color}`,
          transition: "all 0.2s ease",
          boxShadow: active ? `0 0 8px ${color}` : undefined,
        }}
      />
      <span
        style={{
          position: "absolute",
          top: "100%",
          marginTop: "4px",
          fontSize: "0.6rem",
          color,
          fontWeight: active ? "bold" : "normal",
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          whiteSpace: "nowrap",
        }}
      >
        {phase}
      </span>
    </div>
  );
}

function FlightPhaseBar({ current, flightCount }: { current: FlightState; flightCount: number }) {
  const activeIdx = MAIN_PHASES.indexOf(current); // -1 when crashed
  const crashed = current === "crashed";
  const crashColor = phaseColor("crashed", crashed);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: "1.25rem",
        padding: "0.75rem 1rem",
        border: "1px solid var(--pico-muted-color)",
        borderRadius: "8px",
        width: "100%",
      }}
    >
      {/* Phase pipeline */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", paddingTop: "0.5rem", paddingBottom: "0.5rem", minHeight: "4.5rem", gap: 0 }}>
        {MAIN_PHASES.map((phase, i) => {
          const active = i === activeIdx;
          // "flying" node: position: relative for the crash branch
          const isFlyingNode = phase === "flying";
          return (
            <div key={phase} style={{ display: "flex", alignItems: "center", flex: i < MAIN_PHASES.length - 1 ? 1 : undefined }}>
              <div style={isFlyingNode ? { position: "relative" } : undefined}>
                <PhaseNode phase={phase} active={active} />
                {/* Crash branch: vertical line + node below the "flying" node */}
                {isFlyingNode && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      marginTop: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "2px",
                        height: "20px",
                        backgroundColor: crashColor,
                        opacity: crashed ? 0.5 : 0.25,
                        transition: "background-color 0.2s ease",
                      }}
                    />
                    <PhaseNode phase="crashed" active={crashed} />
                  </div>
                )}
              </div>
              {/* Connector line */}
              {i < MAIN_PHASES.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: "2px",
                    backgroundColor: i < activeIdx ? phaseColor(MAIN_PHASES[i + 1], true) : "var(--pico-muted-color)",
                    opacity: i < activeIdx ? 0.5 : 0.25,
                    transition: "background-color 0.2s ease",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Flight count */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "stretch",
          minWidth: "3.5rem",
          lineHeight: 1,
          borderLeft: "1px solid var(--pico-muted-color)",
          paddingLeft: "0.75rem",
        }}
      >
        <strong style={{ fontSize: "1.5rem" }}>{flightCount}</strong>
        <span style={{ fontSize: "0.65rem", marginTop: "2px", color: "var(--pico-muted-color)" }}>
          {flightCount === 1 ? "flight" : "flights"}
        </span>
      </div>
    </div>
  );
}

export function MainScreen({ rhState, rh, elrsState, telemetry, armedProbe, flightProbe, sessionId, onStop, onOpenSettings, onOpenReview }: Props) {
  const channelState = useServiceThrottled(telemetry.channels);
  const batteryState = useService(telemetry.battery);
  const armState = useService(armedProbe);
  const flightState = useService(flightProbe);

  const [lapTimes, setLapTimes] = useState<number[]>([]);

  useEffect(() => {
    return rh.onLapCrossing((crossing) => {
      if (crossing.lapNumber >= 1) {
        setLapTimes((prev) => [...prev, crossing.lapTime]);
      }
    });
  }, [rh]);

  const lapCount = useLiveQuery(
    async () => {
      if (sessionId == null) return 0;
      const flightIds = await db.flights
        .where("sessionId")
        .equals(sessionId)
        .primaryKeys();
      if (flightIds.length === 0) return 0;
      return db.lapEvents
        .where("flightId")
        .anyOf(flightIds)
        .count();
    },
    [sessionId],
    0,
  );

  const flightCount = useLiveQuery(
    () =>
      sessionId != null
        ? db.flights.where("sessionId").equals(sessionId).count()
        : Promise.resolve(0),
    [sessionId],
    0,
  );

  const crashCount = useLiveQuery(
    async () => {
      if (sessionId == null) return 0;
      const flightIds = await db.flights
        .where("sessionId")
        .equals(sessionId)
        .primaryKeys();
      if (flightIds.length === 0) return 0;
      return db.crashEvents
        .where("flightId")
        .anyOf(flightIds)
        .count();
    },
    [sessionId],
    0,
  );

  return (
    <div class="container" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <nav>
        <ul>
          <li>
            <strong>Jauler's FPV Aid</strong>
          </li>
        </ul>
        <ul>
          <li>
            <small>
              <span style={dotStyle(rhDotColor(rhState.status))} />
              RH
            </small>
          </li>
          <li>
            <small>
              <span style={dotStyle(elrsDotColor(elrsState.status))} />
              ELRS
            </small>
          </li>
          <li>
            <button class="outline" style={{ color: "var(--pico-muted-color)", borderColor: "var(--pico-muted-color)" }} onClick={onOpenReview} aria-label="Review">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </li>
          <li>
            <button class="outline" style={{ color: "var(--pico-muted-color)", borderColor: "var(--pico-muted-color)" }} onClick={onOpenSettings} aria-label="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </li>
          <li>
            <button class="outline" style={{ color: "var(--pico-muted-color)", borderColor: "var(--pico-muted-color)" }} onClick={onStop}>
              Stop
            </button>
          </li>
        </ul>
      </nav>

      <div style={{ padding: "1rem 0" }}>
        <FlightPhaseBar current={flightState} flightCount={flightCount} />
      </div>

      <div style={{ marginTop: "auto", paddingBottom: "1rem", position: "relative", display: "flex", justifyContent: "center" }}>
        <div style={{ position: "absolute", left: 0, bottom: "1rem", display: "flex", gap: "4px", alignItems: "stretch" }}>
          <DroneOverlay armState={armState} />
          <div class={batteryState.status !== "active" ? "stale-blink" : ""}>
            <BatteryOverlay voltage={batteryState.data?.voltage ?? null} capacityUsed={batteryState.data?.capacityUsed ?? null} />
          </div>
        </div>
        {channelState.status !== "inactive" && channelState.data && (
          <div class={channelState.status !== "active" ? "stale-blink" : ""}>
            <StickOverlay channels={channelState.data.channels} />
          </div>
        )}
        <div style={{ position: "absolute", right: 0, bottom: "1rem", display: "flex", alignItems: "stretch" }}>
          <StatsOverlay flights={flightCount} laps={lapCount} crashes={crashCount} lapTimes={lapTimes} />
        </div>
      </div>
    </div>
  );
}
