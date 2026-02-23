import {
  CrossfireParser,
  getFrameVariant,
  FRAME_TYPE,
  type RCChannelsPacked,
} from "crsf";
import { SensorService } from "./SensorService";
import type { ChannelsData } from "./telemetry-types";

const STALE_CHECK_INTERVAL = 2000;
const STALE_THRESHOLD = 3000;

export class TelemetryService {
  readonly channels = new SensorService<ChannelsData>();

  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private staleTimer: ReturnType<typeof setInterval> | null = null;

  async start(readable: ReadableStream<Uint8Array>): Promise<void> {
    const parser = new CrossfireParser((frame) => {
      const variant = getFrameVariant(frame);
      if (variant.frameType === FRAME_TYPE.RC_CHANNELS_PACKED) {
        const rc = variant as RCChannelsPacked;
        this.channels.update({
          channels: [
            rc.channel1,
            rc.channel2,
            rc.channel3,
            rc.channel4,
            rc.channel5,
            rc.channel6,
            rc.channel7,
            rc.channel8,
            rc.channel9,
            rc.channel10,
            rc.channel11,
            rc.channel12,
            rc.channel13,
            rc.channel14,
            rc.channel15,
            rc.channel16,
          ],
        });
      }
    });

    this.reader = readable.getReader();
    this.startStaleTimer();

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        parser.appendChunk(value);
      }
    } catch {
      // Reader was cancelled or port disconnected
    }
  }

  stop(): void {
    if (this.reader) {
      this.reader.cancel();
      this.reader = null;
    }
    this.stopStaleTimer();
    this.channels.reset();
  }

  private startStaleTimer(): void {
    this.staleTimer = setInterval(() => {
      const now = Date.now();
      this.checkStaleness(this.channels, now);
    }, STALE_CHECK_INTERVAL);
  }

  private stopStaleTimer(): void {
    if (this.staleTimer !== null) {
      clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
  }

  private checkStaleness<T>(sensor: SensorService<T>, now: number): void {
    const { status, lastUpdated } = sensor.state;
    if (status === "active" && now - lastUpdated > STALE_THRESHOLD) {
      sensor.markStale();
    }
  }
}
