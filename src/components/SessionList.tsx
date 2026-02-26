import { useRef, useState } from "preact/hooks";
import { db, type Session } from "../db";
import { useLiveQuery } from "../hooks/useLiveQuery";

interface Props {
  onStart: (sessionId: number) => void;
}

interface SessionRow extends Session {
  flightCount: number;
}

export function SessionList({ onStart }: Props) {
  const [name, setName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessions = useLiveQuery<SessionRow[]>(
    async () => {
      const all = await db.sessions.orderBy(":id").reverse().toArray();
      return Promise.all(
        all.map(async (s) => {
          const flightCount = await db.flights
            .where("sessionId")
            .equals(s.id!)
            .count();
          return { ...s, flightCount };
        }),
      );
    },
    [],
    [],
  );

  const handleCreate = async () => {
    const id = await db.sessions.add({
      name: name.trim() || undefined,
      startedAt: new Date(),
      endedAt: null,
    });
    setName("");
    onStart(id as number);
  };

  const handleDelete = async (session: SessionRow) => {
    const flightIds = await db.flights
      .where("sessionId")
      .equals(session.id!)
      .primaryKeys();

    await db.transaction("rw", [db.sessions, db.flights, db.batterySamples, db.stickSamples, db.crashEvents, db.lapEvents, db.svLevelEvents], async () => {
      for (const fid of flightIds) {
        await db.batterySamples.where("flightId").equals(fid).delete();
        await db.stickSamples.where("flightId").equals(fid).delete();
        await db.crashEvents.where("flightId").equals(fid).delete();
        await db.lapEvents.where("flightId").equals(fid).delete();
        await db.svLevelEvents.where("flightId").equals(fid).delete();
      }
      await db.flights.where("sessionId").equals(session.id!).delete();
      await db.sessions.delete(session.id!);
    });
  };

  const handleExport = async (session: SessionRow) => {
    const flights = await db.flights
      .where("sessionId")
      .equals(session.id!)
      .toArray();
    const flightIds = flights.map((f) => f.id!);

    const [batterySamples, stickSamples, crashEvents, lapEvents, svLevelEvents] =
      await Promise.all([
        db.batterySamples.where("flightId").anyOf(flightIds).toArray(),
        db.stickSamples.where("flightId").anyOf(flightIds).toArray(),
        db.crashEvents.where("flightId").anyOf(flightIds).toArray(),
        db.lapEvents.where("flightId").anyOf(flightIds).toArray(),
        db.svLevelEvents.where("flightId").anyOf(flightIds).toArray(),
      ]);

    const { id: _, ...sessionData } = session;
    const data = {
      version: 1,
      session: { ...sessionData, flightCount: undefined },
      flights: flights.map(({ id: _, sessionId: __, ...f }) => f),
      batterySamples: batterySamples.map(({ id: _, flightId, ...s }) => ({
        ...s,
        flightIndex: flights.findIndex((f) => f.id === flightId),
      })),
      stickSamples: stickSamples.map(({ id: _, flightId, ...s }) => ({
        ...s,
        flightIndex: flights.findIndex((f) => f.id === flightId),
      })),
      crashEvents: crashEvents.map(({ id: _, flightId, ...e }) => ({
        ...e,
        flightIndex: flights.findIndex((f) => f.id === flightId),
      })),
      lapEvents: lapEvents.map(({ id: _, flightId, ...e }) => ({
        ...e,
        flightIndex: flights.findIndex((f) => f.id === flightId),
      })),
      svLevelEvents: svLevelEvents.map(({ id: _, flightId, ...e }) => ({
        ...e,
        flightIndex: flights.findIndex((f) => f.id === flightId),
      })),
    };

    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label = session.name || "session";
    a.download = `fpv-aid-${label.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.version !== 1) {
        alert("Unsupported export file version.");
        return;
      }

      await db.transaction("rw", [db.sessions, db.flights, db.batterySamples, db.stickSamples, db.crashEvents, db.lapEvents, db.svLevelEvents], async () => {
        const sessionId = (await db.sessions.add({
          name: data.session.name,
          startedAt: new Date(data.session.startedAt),
          endedAt: data.session.endedAt ? new Date(data.session.endedAt) : null,
        })) as number;

        const flightIdMap: number[] = [];
        for (const f of data.flights) {
          const fid = (await db.flights.add({
            sessionId,
            startedAt: new Date(f.startedAt),
            endedAt: f.endedAt ? new Date(f.endedAt) : null,
          })) as number;
          flightIdMap.push(fid);
        }

        for (const s of data.batterySamples ?? []) {
          await db.batterySamples.add({
            flightId: flightIdMap[s.flightIndex],
            startTime: s.startTime,
            samples: s.samples,
          });
        }

        for (const s of data.stickSamples ?? []) {
          await db.stickSamples.add({
            flightId: flightIdMap[s.flightIndex],
            startTime: s.startTime,
            samples: s.samples,
          });
        }

        for (const e of data.crashEvents ?? []) {
          await db.crashEvents.add({
            flightId: flightIdMap[e.flightIndex],
            timestamp: new Date(e.timestamp),
          });
        }

        for (const e of data.lapEvents ?? []) {
          await db.lapEvents.add({
            flightId: flightIdMap[e.flightIndex],
            timestamp: new Date(e.timestamp),
            lapNumber: e.lapNumber,
            lapTime: e.lapTime,
          });
        }

        for (const e of data.svLevelEvents ?? []) {
          await db.svLevelEvents.add({
            flightId: flightIdMap[e.flightIndex],
            timestamp: new Date(e.timestamp),
            targetLevel: e.targetLevel,
            runningAverage: e.runningAverage,
            lapTime: e.lapTime,
            trigger: e.trigger,
          });
        }
      });
    } catch (e) {
      alert("Failed to import session: " + (e instanceof Error ? e.message : e));
    }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div>
      <div role="group" style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Session name (optional)"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
        <button style={{ whiteSpace: "nowrap" }} onClick={handleCreate}>Start new session</button>
        <button
          class="outline secondary"
          style={{ whiteSpace: "nowrap" }}
          onClick={() => fileInputRef.current?.click()}
        >
          Import session
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              handleImport(file);
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
      </div>

      {sessions.length > 0 && (
        <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Session</th>
              <th>Started</th>
              <th>Flights</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={s.id}>
                <td>{s.name || `Session #${sessions.length - i}`}</td>
                <td>{formatDate(s.startedAt)}</td>
                <td>{s.flightCount}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div role="group">
                    <button class="outline" onClick={() => onStart(s.id!)}>
                      Resume
                    </button>
                    <button class="outline" onClick={() => handleExport(s)}>
                      Export
                    </button>
                    <button class="outline secondary" onClick={() => handleDelete(s)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
