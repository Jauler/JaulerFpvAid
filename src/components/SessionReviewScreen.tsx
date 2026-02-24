import { useMemo } from "preact/hooks";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db, type Flight } from "../db";
import { formatTime, formatDuration } from "../utils/format";

interface Props {
  sessionId: number;
  onBack: () => void;
  onSelectFlight: (flightId: number) => void;
}

interface FlightRow extends Flight {
  crashCount: number;
  duration: number;
}

export function SessionReviewScreen({ sessionId, onBack, onSelectFlight }: Props) {
  const flights = useLiveQuery<FlightRow[]>(
    async () => {
      const all = await db.flights
        .where("sessionId")
        .equals(sessionId)
        .toArray();
      return Promise.all(
        all.map(async (f) => {
          const crashCount = await db.crashEvents
            .where("flightId")
            .equals(f.id!)
            .count();
          const endMs = f.endedAt ? f.endedAt.getTime() : Date.now();
          const duration = (endMs - f.startedAt.getTime()) / 1000;
          return { ...f, crashCount, duration };
        }),
      );
    },
    [sessionId],
    [],
  );

  const stats = useMemo(() => {
    const totalFlights = flights.length;
    const totalCrashes = flights.reduce((sum, f) => sum + f.crashCount, 0);
    const crashRate = totalFlights > 0 ? (totalCrashes / totalFlights) * 100 : 0;
    return { totalFlights, totalCrashes, crashRate };
  }, [flights]);

  return (
    <div class="container" style={{ maxWidth: "75vw" }}>
      <nav>
        <ul>
          <li>
            <strong>Session Review</strong>
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
          <strong>{stats.totalFlights}</strong>
          <br />
          <small>Total Flights</small>
        </article>
        <article>
          <strong>{stats.totalCrashes}</strong>
          <br />
          <small>Total Crashes</small>
        </article>
        <article>
          <strong>{stats.crashRate.toFixed(0)}%</strong>
          <br />
          <small>Crash Rate</small>
        </article>
      </div>

      {flights.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Crashes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {flights.map((f, i) => (
                <tr key={f.id}>
                  <td>{i + 1}</td>
                  <td>{formatTime(f.startedAt)}</td>
                  <td>{formatDuration(f.duration)}</td>
                  <td>{f.crashCount}</td>
                  <td>
                    <button class="outline" onClick={() => onSelectFlight(f.id!)}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {flights.length === 0 && <p>No flights recorded yet.</p>}
    </div>
  );
}
