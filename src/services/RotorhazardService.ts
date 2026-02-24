import { io, Socket } from "socket.io-client";
import { Subscribable } from "./Subscribable";

export type RhConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

export interface RhConfig {
  address: string;
  username: string;
  password: string;
}

export interface RhState {
  status: RhConnectionStatus;
  config: RhConfig;
}

export interface LapCrossing {
  pilotId: number;
  callsign: string;
  lapNumber: number;
  lapTime: number;
  lapTimestamp: number;
}

interface RhLap {
  lap_index: number;
  lap_number: number;
  lap_raw: number;
  lap_time: string;
  lap_time_stamp: number;
}

interface RhPilot {
  id: number;
  name: string;
  callsign: string;
}

interface RhNodeEntry {
  laps: RhLap[];
  pilot: RhPilot | null;
  finished_flag: boolean | null;
}

interface RhCurrentLapsPayload {
  current: { node_index: RhNodeEntry[] };
}

export class RotorhazardService extends Subscribable<RhState> {
  private socket: Socket | null = null;
  private lapListeners = new Set<(crossing: LapCrossing) => void>();
  private prevLapCounts = new Map<number, number>();
  private synced = false;
  private callsign = "";

  constructor() {
    super({
      status: "disconnected",
      config: { address: "http://192.168.1.100:5000", username: "", password: "" },
    });
  }

  setCallsign(cs: string): void {
    this.callsign = cs;
  }

  onLapCrossing(fn: (crossing: LapCrossing) => void): () => void {
    this.lapListeners.add(fn);
    return () => this.lapListeners.delete(fn);
  }

  updateConfig(partial: Partial<RhConfig>): void {
    this.setState({
      ...this.state,
      config: { ...this.state.config, ...partial },
    });
  }

  connect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }

    const { address, username, password } = this.state.config;

    this.setState({ ...this.state, status: "connecting" });

    const s = io(address, {
      transports: ["websocket"],
      timeout: 5000,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 120000,
      auth: { username, password },
    });

    s.on("connect", () => {
      this.synced = false;
      this.prevLapCounts.clear();
      s.emit("load_all");
      this.setState({ ...this.state, status: "connected" });
    });
    s.on("disconnect", () => this.setState({ ...this.state, status: "disconnected" }));
    s.on("connect_error", () => this.setState({ ...this.state, status: "error" }));

    s.io.on("reconnect_attempt", () => this.setState({ ...this.state, status: "reconnecting" }));
    s.io.on("reconnect", () => this.setState({ ...this.state, status: "connected" }));

    s.on("current_laps", (payload: RhCurrentLapsPayload) => {
      const nodes = payload.current?.node_index;
      if (!Array.isArray(nodes)) return;

      for (let nodeIdx = 0; nodeIdx < nodes.length; nodeIdx++) {
        const node = nodes[nodeIdx];
        if (!node.pilot) continue;

        const pilotCallsign = node.pilot.callsign;
        if (this.callsign && pilotCallsign.toLowerCase() !== this.callsign.toLowerCase()) {
          continue;
        }

        const lapCount = node.laps.length;

        if (this.synced) {
          const prevCount = this.prevLapCounts.get(nodeIdx) ?? 0;
          for (let i = prevCount; i < lapCount; i++) {
            const lap = node.laps[i];
            const crossing: LapCrossing = {
              pilotId: node.pilot.id,
              callsign: pilotCallsign,
              lapNumber: lap.lap_number,
              lapTime: lap.lap_raw,
              lapTimestamp: lap.lap_time_stamp,
            };
            this.lapListeners.forEach((fn) => fn(crossing));
          }
        }

        this.prevLapCounts.set(nodeIdx, lapCount);
      }

      this.synced = true;
    });

    this.socket = s;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.prevLapCounts.clear();
    this.setState({ ...this.state, status: "disconnected" });
  }
}
