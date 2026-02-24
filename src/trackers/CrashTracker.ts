import type { FlightProbe, FlightState } from "../probes/FlightProbe";
import { db } from "../db";

export class CrashTracker {
  private sessionId: number | null = null;
  private unsub: (() => void) | null = null;
  private prevState: FlightState = "off";

  constructor(private flightProbe: FlightProbe) {}

  startSession(sessionId: number): void {
    this.sessionId = sessionId;
    this.prevState = this.flightProbe.state;
    this.unsub = this.flightProbe.subscribe((state) => this.onStateChange(state));
  }

  endSession(): void {
    this.unsub?.();
    this.unsub = null;
    this.sessionId = null;
  }

  dispose(): void {
    this.endSession();
  }

  private async onStateChange(next: FlightState): Promise<void> {
    const prev = this.prevState;
    this.prevState = next;

    if (next === "crashed" && prev !== "crashed" && this.sessionId != null) {
      const lastFlight = await db.flights
        .where("sessionId")
        .equals(this.sessionId)
        .last();
      if (lastFlight?.id != null) {
        await db.crashEvents.add({
          flightId: lastFlight.id,
          timestamp: new Date(),
        });
      }
    }
  }
}
