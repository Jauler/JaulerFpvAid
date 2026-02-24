import type { Table } from "dexie";
import type { SensorService } from "../services/SensorService";

export class FlightRecorder<T> {
  private unsub: (() => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private buffer: Array<{ t: number; [key: string]: unknown }> = [];
  private startTs = 0;
  private flightId = 0;

  constructor(
    private table: Table,
    private sensor: SensorService<T>,
    private mapFn: (data: T) => object,
    private flushIntervalMs = 2000,
  ) {}

  start(flightId: number): void {
    this.flightId = flightId;
    this.startTs = Date.now();
    this.buffer = [];

    this.unsub = this.sensor.subscribe((state) => {
      if (state.status === "active" && state.data) {
        this.buffer.push({
          t: Date.now() - this.startTs,
          ...this.mapFn(state.data),
        });
      }
    });

    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
    this.flush();
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    const chunk = this.buffer;
    this.buffer = [];
    this.table.add({
      flightId: this.flightId,
      startTime: this.startTs + chunk[0].t,
      samples: chunk,
    });
  }
}
