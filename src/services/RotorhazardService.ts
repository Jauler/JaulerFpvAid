import { io, Socket } from "socket.io-client";
import { Subscribable } from "./Subscribable";

export type RhConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface RhConfig {
  address: string;
  username: string;
  password: string;
}

export interface RhState {
  status: RhConnectionStatus;
  config: RhConfig;
}

export class RotorhazardService extends Subscribable<RhState> {
  private socket: Socket | null = null;

  constructor() {
    super({
      status: "disconnected",
      config: { address: "http://192.168.1.100:5000", username: "", password: "" },
    });
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
      auth: { username, password },
    });

    s.on("connect", () => this.setState({ ...this.state, status: "connected" }));
    s.on("disconnect", () => this.setState({ ...this.state, status: "disconnected" }));
    s.on("connect_error", () => this.setState({ ...this.state, status: "error" }));

    this.socket = s;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.setState({ ...this.state, status: "disconnected" });
  }
}
