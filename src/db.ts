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

export interface StickSample {
  id?: number;
  flightId: number;
  startTime: number;
  samples: Array<{ t: number; roll: number; pitch: number; throttle: number; yaw: number }>;
}

export interface CrashEvent {
  id?: number;
  flightId: number;
  timestamp: Date;
}

export interface LapEvent {
  id?: number;
  flightId: number;
  timestamp: Date;
  lapNumber: number;
  lapTime: number;
}

export interface HoleshotEvent {
  id?: number;
  flightId: number;
  timestamp: Date;
}

export interface SvLevelEvent {
  id?: number;
  flightId: number;
  timestamp: Date;
  targetLevel: number;
  runningAverage: number;
  lapTime: number | null;
  trigger: "lap" | "crash" | "manual";
}

class AppDatabase extends Dexie {
  sessions!: Table<Session>;
  flights!: Table<Flight>;
  batterySamples!: Table<BatterySample>;
  stickSamples!: Table<StickSample>;
  crashEvents!: Table<CrashEvent>;
  lapEvents!: Table<LapEvent>;
  holeshotEvents!: Table<HoleshotEvent>;
  svLevelEvents!: Table<SvLevelEvent>;

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
    this.version(4).stores({
      sessions: "++id",
      flights: "++id, sessionId",
      batterySamples: "++id, flightId",
      stickSamples: "++id, flightId",
      crashEvents: "++id, flightId",
    });
    this.version(5).stores({
      sessions: "++id",
      flights: "++id, sessionId",
      batterySamples: "++id, flightId",
      stickSamples: "++id, flightId",
      crashEvents: "++id, flightId",
      lapEvents: "++id, flightId",
    });
    this.version(6).stores({
      sessions: "++id",
      flights: "++id, sessionId",
      batterySamples: "++id, flightId",
      stickSamples: "++id, flightId",
      crashEvents: "++id, flightId",
      lapEvents: "++id, flightId",
      svLevelEvents: "++id, flightId",
    });
    this.version(7).stores({
      sessions: "++id",
      flights: "++id, sessionId",
      batterySamples: "++id, flightId",
      stickSamples: "++id, flightId",
      crashEvents: "++id, flightId",
      lapEvents: "++id, flightId",
      holeshotEvents: "++id, flightId",
      svLevelEvents: "++id, flightId",
    });
  }
}

export const db = new AppDatabase();
