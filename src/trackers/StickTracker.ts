import type { ArmedProbe } from "../probes/ArmedProbe";
import type { SensorService } from "../services/SensorService";
import type { ChannelsData } from "../services/telemetry-types";
import { db } from "../db";

export class StickTracker {
  private sessionId: number | null = null;
  private recording = false;
  private flightId = 0;
  private startTs = 0;
  private buffer: Array<{ t: number; roll: number; pitch: number; throttle: number; yaw: number }> = [];

  // Accumulator for averaging between 50Hz ticks
  private accRoll = 0;
  private accPitch = 0;
  private accThrottle = 0;
  private accYaw = 0;
  private accCount = 0;

  private unsubChannels: (() => void) | null = null;
  private unsubArmed: (() => void) | null = null;
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private armedProbe: ArmedProbe,
    private channelsSensor: SensorService<ChannelsData>,
  ) {}

  resumeSession(id: number): void {
    this.sessionId = id;
    this.recording = false;
    this.unsubArmed = this.armedProbe.subscribe(() => this.evaluate());
  }

  async endSession(): Promise<void> {
    this.unsubArmed?.();
    this.unsubArmed = null;
    if (this.recording) {
      this.stopRecording();
    }
    this.sessionId = null;
  }

  dispose(): void {
    this.unsubArmed?.();
    this.unsubArmed = null;
    this.stopRecording();
  }

  private evaluate(): void {
    const armState = this.armedProbe.state;

    if (!this.recording) {
      if (armState === "armed" || armState === "turtle") {
        this.recording = true;
        this.startRecording();
      }
    } else {
      if (armState === "off") {
        this.stopRecording();
        this.recording = false;
      }
    }
  }

  private async startRecording(): Promise<void> {
    if (this.sessionId == null) return;

    const flightId = await db.flights
      .where("sessionId")
      .equals(this.sessionId)
      .last();
    if (!flightId?.id) return;

    this.flightId = flightId.id;
    this.startTs = Date.now();
    this.buffer = [];
    this.accRoll = 0;
    this.accPitch = 0;
    this.accThrottle = 0;
    this.accYaw = 0;
    this.accCount = 0;

    this.unsubChannels = this.channelsSensor.subscribe((state) => {
      if (state.status === "active" && state.data) {
        const ch = state.data.channels;
        this.accRoll += ch[0] ?? 1500;
        this.accPitch += ch[1] ?? 1500;
        this.accThrottle += ch[2] ?? 1500;
        this.accYaw += ch[3] ?? 1500;
        this.accCount++;
      }
    });

    // 50Hz sampling: average accumulated values every 20ms
    this.sampleTimer = setInterval(() => {
      if (this.accCount === 0) return;
      this.buffer.push({
        t: Date.now() - this.startTs,
        roll: this.accRoll / this.accCount,
        pitch: this.accPitch / this.accCount,
        throttle: this.accThrottle / this.accCount,
        yaw: this.accYaw / this.accCount,
      });
      this.accRoll = 0;
      this.accPitch = 0;
      this.accThrottle = 0;
      this.accYaw = 0;
      this.accCount = 0;
    }, 20);

    // Flush to DB every 2s
    this.flushTimer = setInterval(() => this.flush(), 2000);
  }

  private stopRecording(): void {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.unsubChannels) {
      this.unsubChannels();
      this.unsubChannels = null;
    }
    this.flush();
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    const chunk = this.buffer;
    this.buffer = [];
    db.stickSamples.add({
      flightId: this.flightId,
      startTime: this.startTs + chunk[0].t,
      samples: chunk,
    });
  }
}
