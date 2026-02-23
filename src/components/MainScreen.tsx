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

export function MainScreen({ rhState, elrsState, telemetry, onStop }: Props) {
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
            <button class="secondary outline" onClick={onStop}>
              Stop
            </button>
          </li>
        </ul>
      </nav>

      <div style={{ marginTop: "auto", paddingBottom: "1rem", position: "relative", display: "flex", justifyContent: "center" }}>
        <div style={{ position: "absolute", left: 0, bottom: "1rem", display: "flex", gap: "4px", alignItems: "flex-end" }}>
          <div style={{ opacity: flightModeState.status === "stale" ? 0.4 : 1 }}>
            <FlightModeOverlay mode={flightModeState.data?.mode || "---"} />
          </div>
          <div style={{ opacity: batteryState.status === "stale" ? 0.4 : 1 }}>
            <BatteryOverlay voltage={batteryState.data?.voltage ?? null} capacityUsed={batteryState.data?.capacityUsed ?? null} />
          </div>
        </div>
        {channelState.status !== "inactive" && channelState.data && (
          <div style={{ opacity: channelState.status === "stale" ? 0.4 : 1 }}>
            <StickOverlay channels={channelState.data.channels} />
          </div>
        )}
      </div>
    </div>
  );
}
