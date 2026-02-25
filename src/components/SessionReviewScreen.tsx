import { useMemo, useState } from "preact/hooks";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { db, type Flight, type LapEvent, type CrashEvent, type SvLevelEvent } from "../db";
import { formatTime, formatDuration } from "../utils/format";
import { FlightDetailScreen } from "./FlightDetailScreen";
import { LapTimeChart } from "./LapTimeChart";
import { LapTimeHistogram } from "./LapTimeHistogram";
import { CrashTimingHistogram } from "./CrashTimingHistogram";
import { SpeedLevelChart } from "./SpeedLevelChart";
import { CrashesPerLevelChart } from "./CrashesPerLevelChart";

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

  const allLaps = useLiveQuery<LapEvent[]>(
    async () => {
      const flightIds = await db.flights
        .where("sessionId")
        .equals(sessionId)
        .primaryKeys();
      if (flightIds.length === 0) return [];
      const laps: LapEvent[] = [];
      for (const fid of flightIds) {
        const fl = await db.lapEvents.where("flightId").equals(fid).toArray();
        laps.push(...fl);
      }
      return laps;
    },
    [sessionId],
    [],
  );

  const allCrashes = useLiveQuery<CrashEvent[]>(
    async () => {
      const flightIds = await db.flights
        .where("sessionId")
        .equals(sessionId)
        .primaryKeys();
      if (flightIds.length === 0) return [];
      const crashes: CrashEvent[] = [];
      for (const fid of flightIds) {
        const fc = await db.crashEvents.where("flightId").equals(fid).toArray();
        crashes.push(...fc);
      }
      return crashes;
    },
    [sessionId],
    [],
  );

  const svLevelEvents = useLiveQuery<SvLevelEvent[]>(
    async () => {
      const flightIds = await db.flights
        .where("sessionId")
        .equals(sessionId)
        .primaryKeys();
      if (flightIds.length === 0) return [];
      const events: SvLevelEvent[] = [];
      for (const fid of flightIds) {
        const fe = await db.svLevelEvents.where("flightId").equals(fid).toArray();
        events.push(...fe);
      }
      return events;
    },
    [sessionId],
    [],
  );

  const crashTimings = useMemo(() => {
    // For each flight, sort laps by timestamp, then for each lap find the
    // first crash between this lap's timestamp and the next lap's timestamp.
    // Return seconds-into-lap for each such first crash, capped to average lap time.
    const timings: number[] = [];

    const realLaps = allLaps.filter((l) => l.lapNumber >= 1);
    const avgLapSec = realLaps.length > 0
      ? realLaps.reduce((s, l) => s + l.lapTime, 0) / realLaps.length / 1000
      : Infinity;

    // Group laps and crashes by flightId
    const lapsByFlight = new Map<number, LapEvent[]>();
    for (const l of allLaps) {
      if (l.flightId == null) continue;
      const arr = lapsByFlight.get(l.flightId) ?? [];
      arr.push(l);
      lapsByFlight.set(l.flightId, arr);
    }

    const crashesByFlight = new Map<number, CrashEvent[]>();
    for (const c of allCrashes) {
      if (c.flightId == null) continue;
      const arr = crashesByFlight.get(c.flightId) ?? [];
      arr.push(c);
      crashesByFlight.set(c.flightId, arr);
    }

    for (const [flightId, laps] of lapsByFlight) {
      const crashes = crashesByFlight.get(flightId);
      if (!crashes || crashes.length === 0) continue;

      const sortedLaps = [...laps].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const sortedCrashes = [...crashes].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      for (let i = 0; i < sortedLaps.length; i++) {
        const lapStart = sortedLaps[i].timestamp.getTime();
        const lapEnd = i + 1 < sortedLaps.length
          ? sortedLaps[i + 1].timestamp.getTime()
          : Infinity;

        // Find first crash in this lap window
        const firstCrash = sortedCrashes.find(
          (c) => c.timestamp.getTime() >= lapStart && c.timestamp.getTime() < lapEnd,
        );
        if (firstCrash) {
          const raw = (firstCrash.timestamp.getTime() - lapStart) / 1000;
          timings.push(Math.min(raw, avgLapSec));
        }
      }
    }

    return timings;
  }, [allLaps, allCrashes]);

  const stats = useMemo(() => {
    const totalFlights = flights.length;
    const totalCrashes = flights.reduce((sum, f) => sum + f.crashCount, 0);
    const totalLaps = allLaps.filter((l) => l.lapNumber >= 1).length;
    const crashRate = totalLaps > 0 ? (totalCrashes / totalLaps) * 100 : 0;
    return { totalFlights, totalCrashes, totalLaps, crashRate };
  }, [flights, allLaps]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <nav style={{ padding: "0 1rem", marginBottom: 0 }}>
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
            padding: "0.5rem 0.5rem",
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

              {allLaps.filter((l) => l.lapNumber >= 1).length > 0 && (
                <div style={{ display: "flex", gap: "1rem" }}>
                  <article style={{ flex: 1, minWidth: 0 }}>
                    <header>Lap Times</header>
                    <LapTimeChart laps={allLaps} />
                  </article>
                  <article style={{ flex: 1, minWidth: 0 }}>
                    <header>Lap Time Distribution</header>
                    <LapTimeHistogram laps={allLaps} />
                  </article>
                </div>
              )}

              {crashTimings.length > 0 && (
                <article>
                  <header>Time Into Lap at First Crash</header>
                  <CrashTimingHistogram crashTimings={crashTimings} />
                </article>
              )}

              {svLevelEvents.length > 0 && (
                <article>
                  <header>Speed Variance Level Progression</header>
                  <SpeedLevelChart events={svLevelEvents} />
                </article>
              )}

              {svLevelEvents.some((e) => e.trigger === "crash") && (
                <article>
                  <header>Crashes per Level</header>
                  <CrashesPerLevelChart events={svLevelEvents} />
                </article>
              )}

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
