import { Subscribable } from "../services/Subscribable";
import { type SensorService } from "../services/SensorService";
import type { ChannelsData, FlightModeData } from "../services/telemetry-types";
import type { Settings } from "../settings";

export type DroneArmState = "off" | "disarmed" | "armed" | "turtle";

export class ArmedProbe extends Subscribable<DroneArmState> {
  private unsubChannels: () => void;
  private unsubFlightMode: () => void;

  constructor(
    private channels: SensorService<ChannelsData>,
    private flightMode: SensorService<FlightModeData>,
    private getSettings: () => Settings,
  ) {
    super("off");
    this.unsubChannels = channels.subscribe(() => this.recompute());
    this.unsubFlightMode = flightMode.subscribe(() => this.recompute());
  }

  private recompute(): void {
    const next = this.derive();
    if (next !== this.state) {
      this.setState(next);
    }
  }

  private derive(): DroneArmState {
    if (this.flightMode.state.status !== "active") return "off";

    const chData = this.channels.state.data;
    if (!chData) return "off";

    const s = this.getSettings();
    const armValue = chData.channels[s.armChannel] ?? 0;
    if (armValue < s.armRangeMin || armValue > s.armRangeMax) return "disarmed";

    const turtleValue = chData.channels[s.turtleChannel] ?? 0;
    if (turtleValue >= s.turtleRangeMin && turtleValue <= s.turtleRangeMax) return "turtle";

    return "armed";
  }

  dispose(): void {
    this.unsubChannels();
    this.unsubFlightMode();
  }
}
