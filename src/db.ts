import Dexie, { type Table } from "dexie";

export interface Session {
  id?: number;
  name?: string;
  startedAt: Date;
  endedAt: Date | null;
}

export interface Flight {
  id?: number;
  sessionId: number;
  startedAt: Date;
  endedAt: Date | null;
}

export interface BatterySample {
  id?: number;
  flightId: number;
  startTime: number;
  samples: Array<{ t: number; voltage: number; amperage: number }>;
}

export interface CrashEvent {
  id?: number;
  flightId: number;
  timestamp: Date;
}

class AppDatabase extends Dexie {
  sessions!: Table<Session>;
  flights!: Table<Flight>;
  batterySamples!: Table<BatterySample>;
  crashEvents!: Table<CrashEvent>;

  constructor() {
    super("fpv-aid");
    this.version(1).stores({
      sessions: "++id",
      flights: "++id, sessionId",
      batterySamples: "++id, flightId",
    });
    this.version(2).stores({
      sessions: "++id",
      flights: "++id, sessionId",
      batterySamples: "++id, flightId",
    });
    this.version(3).stores({
      sessions: "++id",
      flights: "++id, sessionId",
      batterySamples: "++id, flightId",
      crashEvents: "++id, flightId",
    });
  }
}

export const db = new AppDatabase();
