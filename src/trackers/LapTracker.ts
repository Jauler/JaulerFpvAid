import type { RotorhazardService, LapCrossing } from "../services/RotorhazardService";
import { db } from "../db";

export class LapTracker {
  private sessionId: number | null = null;
  private unsub: (() => void) | null = null;

  constructor(private rh: RotorhazardService) {}

  startSession(sessionId: number): void {
    this.sessionId = sessionId;
    this.unsub = this.rh.onLapCrossing((crossing) => this.onLap(crossing));
  }

  endSession(): void {
    this.unsub?.();
    this.unsub = null;
    this.sessionId = null;
  }

  private async onLap(crossing: LapCrossing): Promise<void> {
    if (this.sessionId == null) return;

    const lastFlight = await db.flights
      .where("sessionId")
      .equals(this.sessionId)
      .last();

    if (lastFlight?.id != null) {
      await db.lapEvents.add({
        flightId: lastFlight.id,
        timestamp: new Date(),
        lapNumber: crossing.lapNumber,
        lapTime: crossing.lapTime,
      });
    }
  }
}
