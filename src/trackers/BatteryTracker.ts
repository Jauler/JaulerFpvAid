import type { ArmedProbe } from "../probes/ArmedProbe";
import type { SensorService } from "../services/SensorService";
import type { BatteryData } from "../services/telemetry-types";
import { db } from "../db";
import { FlightRecorder } from "./FlightRecorder";

export class BatteryTracker {
  private sessionId: number | null = null;
  private recording = false;
  private recorder: FlightRecorder<BatteryData>;
  private unsubArmed: (() => void) | null = null;

  constructor(
    private armedProbe: ArmedProbe,
    batterySensor: SensorService<BatteryData>,
  ) {
    this.recorder = new FlightRecorder(
      db.batterySamples,
      batterySensor,
      (d) => ({ voltage: d.voltage, amperage: d.current }),
    );
  }

  async startSession(): Promise<void> {
    this.sessionId = await db.sessions.add({
      startedAt: new Date(),
      endedAt: null,
    });
    this.recording = false;
    this.subscribe();
  }

  resumeSession(id: number): void {
    this.sessionId = id;
    this.recording = false;
    this.subscribe();
  }

  async endSession(): Promise<void> {
    this.unsubscribe();
    if (this.recording) {
      this.recorder.stop();
      await this.finishFlight();
    }
    this.recording = false;
    if (this.sessionId != null) {
      await db.sessions.update(this.sessionId, { endedAt: new Date() });
      this.sessionId = null;
    }
  }

  getSessionId(): number | null {
    return this.sessionId;
  }

  dispose(): void {
    this.unsubscribe();
  }

  private subscribe(): void {
    this.unsubArmed = this.armedProbe.subscribe(() => this.evaluate());
  }

  private unsubscribe(): void {
    this.unsubArmed?.();
    this.unsubArmed = null;
  }

  private evaluate(): void {
    const armState = this.armedProbe.state;

    if (!this.recording) {
      if (armState === "armed" || armState === "turtle") {
        this.recording = true;
        this.startFlight();
      }
    } else {
      if (armState === "off") {
        this.recorder.stop();
        this.finishFlight();
        this.recording = false;
      }
    }
  }

  private async startFlight(): Promise<void> {
    if (this.sessionId == null) return;
    const flightId = await db.flights.add({
      sessionId: this.sessionId,
      startedAt: new Date(),
      endedAt: null,
    });
    this.recorder.start(flightId as number);
  }

  private async finishFlight(): Promise<void> {
    const lastFlight = await db.flights
      .where("sessionId")
      .equals(this.sessionId!)
      .last();
    if (lastFlight?.id != null) {
      await db.flights.update(lastFlight.id, { endedAt: new Date() });
    }
  }
}
