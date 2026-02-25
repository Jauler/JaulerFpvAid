import { useMemo, useState } from "preact/hooks";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db, type Flight } from "../db";
import { formatTime, formatDuration } from "../utils/format";
import { FlightDetailScreen } from "./FlightDetailScreen";

interface Props {
  sessionId: number;
  onBack: () => void;
}

interface FlightRow extends Flight {
  crashCount: number;
  lapCount: number;
  duration: number;
}

export function SessionReviewScreen({ sessionId, onBack }: Props) {
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);

  const flights = useLiveQuery<FlightRow[]>(
    async () => {
      const all = await db.flights
        .where("sessionId")
        .equals(sessionId)
        .reverse()
        .toArray();
      return Promise.all(
        all.map(async (f) => {
          const crashCount = await db.crashEvents
            .where("flightId")
            .equals(f.id!)
            .count();
          const lapCount = await db.lapEvents
            .where("flightId")
            .equals(f.id!)
            .count();
          const endMs = f.endedAt ? f.endedAt.getTime() : Date.now();
          const duration = (endMs - f.startedAt.getTime()) / 1000;
          return { ...f, crashCount, lapCount, duration };
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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <nav class="container" style={{ maxWidth: "none", marginBottom: 0 }}>
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

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 200,
            flexShrink: 0,
            borderRight: "1px solid var(--pico-muted-border-color)",
            overflowY: "auto",
            padding: "0.5rem 0",
          }}
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li>
              <a
                href="#"
                role="button"
                class={selectedFlightId === null ? "secondary" : "outline secondary"}
                style={{ display: "block", margin: "0 0.5rem", padding: "0.25rem 0.5rem", textAlign: "left" }}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedFlightId(null);
                }}
              >
                Overview
              </a>
            </li>
          </ul>

          <hr style={{ margin: "0.3rem 0.5rem" }} />
          <small style={{ padding: "0 0.75rem", color: "var(--pico-muted-color)" }}>
            Flights
          </small>

          <ul style={{ listStyle: "none", padding: 0, margin: "0.25rem 0 0" }}>
            {flights.map((f, i) => (
              <li key={f.id}>
                <a
                  href="#"
                  role="button"
                  class={selectedFlightId === f.id ? "secondary" : "outline secondary"}
                  style={{ display: "block", margin: "0 0.5rem", padding: "0.25rem 0.5rem", textAlign: "left" }}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedFlightId(f.id!);
                  }}
                >
                  Flight {flights.length - i}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
          {selectedFlightId == null ? (
            <div style={{ maxWidth: "75vw", margin: "0 auto" }}>
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
                        <th>Laps</th>
                        <th>Crashes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flights.map((f, i) => (
                        <tr key={f.id}>
                          <td>{flights.length - i}</td>
                          <td>{formatTime(f.startedAt)}</td>
                          <td>{formatDuration(f.duration)}</td>
                          <td>{f.lapCount}</td>
                          <td>{f.crashCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {flights.length === 0 && <p>No flights recorded yet.</p>}
            </div>
          ) : (
            <FlightDetailScreen key={selectedFlightId} flightId={selectedFlightId} />
          )}
        </div>
      </div>
    </div>
  );
}
