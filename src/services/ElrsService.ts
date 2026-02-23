import { Subscribable } from "./Subscribable";

export type ElrsConnectionStatus = "disconnected" | "connected" | "unsupported";

export interface ElrsState {
  status: ElrsConnectionStatus;
}

export class ElrsService extends Subscribable<ElrsState> {
  private port: SerialPort | null = null;

  constructor() {
    super({
      status: "serial" in navigator ? "disconnected" : "unsupported",
    });
  }

  async connect(): Promise<void> {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 420000 });
      this.port = port;
      this.setState({ status: "connected" });
    } catch {
      // User cancelled or error — stay disconnected
    }
  }

  getReadable(): ReadableStream<Uint8Array> | null {
    return this.port?.readable ?? null;
  }

  async disconnect(): Promise<void> {
    if (this.port) {
      await this.port.close();
      this.port = null;
      this.setState({ status: "disconnected" });
    }
  }
}
