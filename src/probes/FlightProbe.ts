import { Subscribable } from "../services/Subscribable";
import type { SensorService } from "../services/SensorService";
import type { ChannelsData } from "../services/telemetry-types";
import type { ArmedProbe, DroneArmState } from "./ArmedProbe";
import type { Settings } from "../settings";

export type FlightState = "off" | "prepare" | "flying" | "landed" | "crashed";

const THROTTLE_POLL_MS = 100; // ~10 Hz

export class FlightProbe extends Subscribable<FlightState> {
  private unsubArmed: () => void;
  private unsubChannels: () => void;
  private channelsDirty = false;
  private pollTimer: ReturnType<typeof setInterval>;

  constructor(
    private armed: ArmedProbe,
    private channels: SensorService<ChannelsData>,
    private getSettings: () => Settings,
  ) {
    super("off");
    this.unsubArmed = armed.subscribe(() => this.recompute());
    this.unsubChannels = channels.subscribe(() => { this.channelsDirty = true; });
    this.pollTimer = setInterval(() => this.pollChannels(), THROTTLE_POLL_MS);
  }

  private pollChannels(): void {
    if (!this.channelsDirty) return;
    this.channelsDirty = false;
    this.recompute();
  }

  private throttleAboveThreshold(): boolean {
    const chData = this.channels.state.data;
    if (!chData) return false;
    const pct = this.getSettings().crashThrottlePct;
    const threshold = 988 + (2012 - 988) * pct / 100;
    return (chData.channels[2] ?? 0) >= threshold;
  }

  private recompute(): void {
    const arm: DroneArmState = this.armed.state;
    const cur = this.state;

    let next: FlightState;

    if (arm === "off") {
      next = "off";
    } else {
      switch (cur) {
        case "off":
          next = "prepare";
          break;
        case "prepare":
          next = arm === "armed" && this.throttleAboveThreshold() ? "flying" : "prepare";
          break;
        case "flying":
          if (arm === "disarmed") next = "landed";
          else if (arm === "turtle") next = "crashed";
          else next = "flying";
          break;
        case "landed":
          if (arm === "turtle" || arm === "armed") next = "crashed";
          else next = "landed";
          break;
        case "crashed":
          next = arm === "armed" && this.throttleAboveThreshold() ? "flying" : "crashed";
          break;
        default:
          next = cur;
      }
    }

    if (next !== cur) {
      this.setState(next);
    }
  }

  dispose(): void {
    this.unsubArmed();
    this.unsubChannels();
    clearInterval(this.pollTimer);
  }
}
