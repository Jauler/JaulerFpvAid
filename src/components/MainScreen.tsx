import type { RhState } from "../services/RotorhazardService";
import type { ElrsState } from "../services/ElrsService";
import type { TelemetryService } from "../services/TelemetryService";
import { useService } from "../hooks/useService";
import { StickOverlay } from "./StickOverlay";
import { FlightModeOverlay } from "./FlightModeOverlay";
import { BatteryOverlay } from "./BatteryOverlay";

interface Props {
  rhState: RhState;
  elrsState: ElrsState;
  telemetry: TelemetryService;
  onStop: () => void;
  onOpenSettings: () => void;
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
    case "unsupported":
      return "red";
    default:
      return "grey";
  }
}

export function MainScreen({ rhState, elrsState, telemetry, onStop, onOpenSettings }: Props) {
  const channelState = useService(telemetry.channels);
  const flightModeState = useService(telemetry.flightMode);
  const batteryState = useService(telemetry.battery);

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

      <div style={{ marginTop: "auto", paddingBottom: "1rem", position: "relative", display: "flex", justifyContent: "center" }}>
        <div style={{ position: "absolute", left: 0, bottom: "1rem", display: "flex", gap: "4px", alignItems: "flex-end" }}>
          <div class={flightModeState.status !== "active" ? "stale-blink" : ""}>
            <FlightModeOverlay mode={flightModeState.data?.mode || "---"} />
          </div>
          <div class={batteryState.status !== "active" ? "stale-blink" : ""}>
            <BatteryOverlay voltage={batteryState.data?.voltage ?? null} capacityUsed={batteryState.data?.capacityUsed ?? null} />
          </div>
        </div>
        {channelState.status !== "inactive" && channelState.data && (
          <div class={channelState.status !== "active" ? "stale-blink" : ""}>
            <StickOverlay channels={channelState.data.channels} />
          </div>
        )}
      </div>
    </div>
  );
}
