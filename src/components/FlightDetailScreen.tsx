import { useLiveQuery } from "../hooks/useLiveQuery";
import { db, type Flight, type BatterySample, type CrashEvent, type StickSample, type LapEvent } from "../db";
import { BatteryChart } from "./BatteryChart";
import { StickHeatmap } from "./StickHeatmap";
import { formatTime, formatDuration } from "../utils/format";

interface Props {
  flightId: number;
  onBack?: () => void;
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

  const lapEvents = useLiveQuery<LapEvent[]>(
    () => db.lapEvents.where("flightId").equals(flightId).toArray(),
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
      {onBack && (
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
      )}

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

      {lapEvents.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Lap</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lapEvents.map((le) => (
                <tr key={le.id}>
                  <td>{le.lapNumber}</td>
                  <td>{(le.lapTime / 1000).toFixed(3)}s</td>
                  <td>
                    <button
                      class="outline secondary"
                      style={{ padding: "0.15rem 0.5rem", fontSize: "0.8rem" }}
                      onClick={() => {
                        if (le.id != null) db.lapEvents.delete(le.id);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
