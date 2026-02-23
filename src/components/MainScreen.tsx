import type { RhState } from "../services/RotorhazardService";
import type { ElrsState } from "../services/ElrsService";
import type { TelemetryService } from "../services/TelemetryService";
import { useService } from "../hooks/useService";

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

  return (
    <div class="container">
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

      {channelState.status !== "inactive" && channelState.data && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px",
            opacity: channelState.status === "stale" ? 0.4 : 1,
          }}
        >
          {channelState.data.channels.map((value, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <small style={{ color: "var(--pico-muted-color)" }}>
                CH{i + 1}
              </small>
              <div>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
