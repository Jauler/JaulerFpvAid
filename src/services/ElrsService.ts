import { Subscribable } from "./Subscribable";

export type ElrsConnectionStatus = "disconnected" | "connected" | "lost" | "unsupported";

export interface ElrsState {
  status: ElrsConnectionStatus;
}

export class ElrsService extends Subscribable<ElrsState> {
  private port: SerialPort | null = null;

  constructor() {
    super({
      status: "serial" in navigator ? "disconnected" : "unsupported",
    });

    if ("serial" in navigator) {
      navigator.serial.addEventListener("disconnect", (e) => {
        if ((e.target as SerialPort) === this.port) {
          this.port = null;
          this.setState({ status: "lost" });
        }
      });
    }
  }

  /**
   * Connect to a serial port.
   * First tries previously-granted ports (no gesture needed).
   * Falls back to requestPort() (requires user gesture).
   */
  async connect(): Promise<void> {
    if (this.state.status === "unsupported") return;
    if (this.port) return;

    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        await this.openPort(ports[0]);
        return;
      }
      const port = await navigator.serial.requestPort();
      await this.openPort(port);
    } catch {
      // User cancelled or error — stay in current state
    }
  }

  getReadable(): ReadableStream<Uint8Array> | null {
    return this.port?.readable ?? null;
  }

  async disconnect(): Promise<void> {
    const port = this.port;
    this.port = null;
    if (port) {
      try {
        await port.close();
      } catch {
        // Port may already be lost
      }
    }
    this.setState({ status: "disconnected" });
  }

  private async openPort(port: SerialPort): Promise<void> {
    if (this.port && this.port !== port) {
      try {
        await this.port.close();
      } catch {
        // old port may already be lost
      }
    }

    await port.open({ baudRate: 420000 });
    this.port = port;
    this.setState({ status: "connected" });
  }
}
