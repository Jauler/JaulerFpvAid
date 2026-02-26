import type { RotorhazardService, LapCrossing } from "../services/RotorhazardService";
import type { FlightProbe } from "../probes/FlightProbe";
import { db } from "../db";

export class LapTracker {
  private sessionId: number | null = null;
  private unsubLap: (() => void) | null = null;
  private unsubFlight: (() => void) | null = null;
  private skipNextCrossing = true;

  constructor(
    private rh: RotorhazardService,
    private flightProbe: FlightProbe,
  ) {}

  startSession(sessionId: number): void {
    this.sessionId = sessionId;
    const flightState = this.flightProbe.state;
    this.skipNextCrossing = flightState === "off" || flightState === "crashed";
    this.unsubLap = this.rh.onLapCrossing((crossing) => this.onLap(crossing));
    this.unsubFlight = this.flightProbe.subscribe((fs) => {
      if (fs === "off" || fs === "crashed") {
        this.skipNextCrossing = true;
      }
    });
  }

  endSession(): void {
    this.unsubLap?.();
    this.unsubFlight?.();
    this.unsubLap = null;
    this.unsubFlight = null;
    this.sessionId = null;
  }

  private async onLap(crossing: LapCrossing): Promise<void> {
    if (this.sessionId == null) return;

    if (this.skipNextCrossing) {
      this.skipNextCrossing = false;
      this.recordHoleshot();
      return;
    }

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

  private async recordHoleshot(): Promise<void> {
    if (this.sessionId == null) return;

    const lastFlight = await db.flights
      .where("sessionId")
      .equals(this.sessionId)
      .last();

    if (lastFlight?.id != null) {
      await db.holeshotEvents.add({
        flightId: lastFlight.id,
        timestamp: new Date(),
      });
    }
  }
}
