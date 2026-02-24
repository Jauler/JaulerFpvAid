import { useState } from "preact/hooks";
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

    await db.transaction("rw", [db.sessions, db.flights, db.batterySamples], async () => {
      for (const fid of flightIds) {
        await db.batterySamples.where("flightId").equals(fid).delete();
      }
      await db.flights.where("sessionId").equals(session.id!).delete();
      await db.sessions.delete(session.id!);
    });
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
