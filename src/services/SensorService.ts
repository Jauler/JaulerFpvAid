import { Subscribable } from "./Subscribable";

export interface SensorState<T> {
  status: "inactive" | "active" | "stale";
  data: T | null;
  lastUpdated: number;
}

export class SensorService<T> extends Subscribable<SensorState<T>> {
  constructor() {
    super({ status: "inactive", data: null, lastUpdated: 0 });
  }

  update(data: T): void {
    this.setState({ status: "active", data, lastUpdated: Date.now() });
  }

  markStale(): void {
    this.setState({ ...this.state, status: "stale" });
  }

  reset(): void {
    this.setState({ status: "inactive", data: null, lastUpdated: 0 });
  }
}
