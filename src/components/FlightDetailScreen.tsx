import { useLiveQuery } from "../hooks/useLiveQuery";
import { db, type Flight, type BatterySample, type CrashEvent, type StickSample } from "../db";
import { BatteryChart } from "./BatteryChart";
import { StickHeatmap } from "./StickHeatmap";
import { formatTime, formatDuration } from "../utils/format";

interface Props {
  flightId: number;
  onBack: () => void;
}

export function FlightDetailScreen({ flightId, onBack }: Props) {
  const flight = useLiveQuery<Flight | null>(
    () => db.flights.get(flightId) as Promise<Flight | null>,
    [flightId],
    null,
  );

  const batterySamples = useLiveQuery<BatterySample[]>(
    () => db.batterySamples.where("flightId").equals(flightId).toArray(),
    [flightId],
    [],
  );

  const stickSamples = useLiveQuery<StickSample[]>(
    () => db.stickSamples.where("flightId").equals(flightId).toArray(),
    [flightId],
    [],
  );

  const crashEvents = useLiveQuery<CrashEvent[]>(
    () => db.crashEvents.where("flightId").equals(flightId).toArray(),
    [flightId],
    [],
  );

  if (!flight) {
    return (
      <div class="container" style={{ maxWidth: "75vw" }}>
        <p>Loading...</p>
      </div>
    );
  }

  const endMs = flight.endedAt ? flight.endedAt.getTime() : Date.now();
  const durationSec = (endMs - flight.startedAt.getTime()) / 1000;

  return (
    <div class="container" style={{ maxWidth: "75vw" }}>
      <nav>
        <ul>
          <li>
            <strong>Flight Detail</strong>
          </li>
        </ul>
        <ul>
          <li>
            <button class="outline" onClick={onBack}>
              Back
            </button>
          </li>
        </ul>
      </nav>

      <div class="grid">
        <article>
          <strong>{formatTime(flight.startedAt)}</strong>
          <br />
          <small>Started</small>
        </article>
        <article>
          <strong>{formatDuration(durationSec)}</strong>
          <br />
          <small>Duration</small>
        </article>
        <article>
          <strong>{crashEvents.length}</strong>
          <br />
          <small>Crashes</small>
        </article>
      </div>

      {(batterySamples.length > 0 || stickSamples.length > 0) && (
        <div style={{ display: "flex", gap: "1rem", alignItems: "stretch" }}>
          {batterySamples.length > 0 && (
            <article style={{ flex: 1, minWidth: 0 }}>
              <header>Battery</header>
              <BatteryChart samples={batterySamples} />
            </article>
          )}
          {stickSamples.length > 0 && (
            <article style={{ flexShrink: 0 }}>
              <header>Stick Heatmap</header>
              <StickHeatmap stickSamples={stickSamples} />
            </article>
          )}
        </div>
      )}

      {crashEvents.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Time into flight</th>
              </tr>
            </thead>
            <tbody>
              {crashEvents.map((ce, i) => {
                const intoFlightSec =
                  (ce.timestamp.getTime() - flight.startedAt.getTime()) / 1000;
                return (
                  <tr key={ce.id}>
                    <td>{i + 1}</td>
                    <td>{formatTime(ce.timestamp)}</td>
                    <td>{formatDuration(Math.max(0, intoFlightSec))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
