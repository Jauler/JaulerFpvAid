import type { RhState } from "../services/RotorhazardService";
import type { ElrsState } from "../services/ElrsService";

interface Props {
  rhState: RhState;
  elrsState: ElrsState;
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

export function MainScreen({ rhState, elrsState, onStop }: Props) {
  return (
    <nav class="container">
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
  );
}
