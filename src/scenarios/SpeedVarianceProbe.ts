import { Subscribable } from "../services/Subscribable";
import type { RotorhazardService, LapCrossing } from "../services/RotorhazardService";
import type { FlightProbe, FlightState } from "../probes/FlightProbe";
import type { Settings } from "../settings";
import { db } from "../db";
import { announceLevel, speak, playDing } from "../utils/audio";

export type SpeedLevel = -2 | -1 | 0 | 1 | 2;
export type TrainingPhase = "idle" | "warmup" | "active";

export interface TargetLapTimes {
  level2: number;
  level1: number;
  level0: [number, number];
  levelMinus1: number;
  levelMinus2: number;
}

export interface SpeedVarianceState {
  phase: TrainingPhase;
  warmupLapsCompleted: number;
  warmupLapsRequired: number;
  runningAverage: number;
  targetLevel: SpeedLevel;
  targetLapTimes: TargetLapTimes | null;
  consecutiveOnTarget: number;
  lastLapTime: number | null;
}

const INITIAL_STATE: SpeedVarianceState = {
  phase: "idle",
  warmupLapsCompleted: 0,
  warmupLapsRequired: 0,
  runningAverage: 0,
  targetLevel: 0,
  targetLapTimes: null,
  consecutiveOnTarget: 0,
  lastLapTime: null,
};

export class SpeedVarianceProbe extends Subscribable<SpeedVarianceState> {
  private lapTimes: number[] = [];
  private unsubLap: (() => void) | null = null;
  private unsubFlight: (() => void) | null = null;
  private sessionId: number | null = null;
  private skipNextCrossing = true;

  constructor(
    private rh: RotorhazardService,
    private flightProbe: FlightProbe,
    private getSettings: () => Settings,
  ) {
    super({ ...INITIAL_STATE });
  }

  async startSession(sessionId: number): Promise<void> {
    this.sessionId = sessionId;
    this.lapTimes = [];
    this.skipNextCrossing = true;
    const s = this.getSettings();

    // Load existing laps from DB for session resume
    const flightIds = await db.flights
      .where("sessionId")
      .equals(sessionId)
      .primaryKeys();

    if (flightIds.length > 0) {
      const existing = await db.lapEvents
        .where("flightId")
        .anyOf(flightIds)
        .toArray();
      for (const lap of existing) {
        if (lap.lapNumber >= 1) {
          this.lapTimes.push(lap.lapTime);
        }
      }
    }

    const completed = this.lapTimes.length;
    const avg = this.computeBaseline();
    const lastLap = completed > 0 ? this.lapTimes[completed - 1] : null;

    if (completed >= s.warmupLaps) {
      // Restore last level from persisted events
      let restoredLevel: SpeedLevel = 0;
      let consecutive = 0;

      if (flightIds.length > 0) {
        const levelEvents = await db.svLevelEvents
          .where("flightId")
          .anyOf(flightIds)
          .toArray();
        if (levelEvents.length > 0) {
          levelEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          const lastEvent = levelEvents[levelEvents.length - 1];
          restoredLevel = lastEvent.targetLevel as SpeedLevel;

          // Replay recent laps to compute consecutiveOnTarget
          const warmupCount = s.warmupLaps;
          const activeLaps = this.lapTimes.slice(warmupCount);
          for (let i = activeLaps.length - 1; i >= 0; i--) {
            if (this.lapFitsCurrentTarget(activeLaps[i], avg, restoredLevel)) {
              consecutive++;
            } else {
              break;
            }
          }
        }
      }

      const targets = this.computeTargetLapTimes(avg);
      this.setState({
        ...INITIAL_STATE,
        phase: "active",
        warmupLapsCompleted: completed,
        warmupLapsRequired: s.warmupLaps,
        runningAverage: avg,
        targetLevel: restoredLevel,
        targetLapTimes: targets,
        consecutiveOnTarget: consecutive,
        lastLapTime: lastLap,
      });
    } else {
      this.setState({
        ...INITIAL_STATE,
        phase: "warmup",
        warmupLapsCompleted: completed,
        warmupLapsRequired: s.warmupLaps,
        runningAverage: avg,
        lastLapTime: lastLap,
      });
    }

    this.unsubLap = this.rh.onLapCrossing((c) => this.onLap(c));
    this.unsubFlight = this.flightProbe.subscribe((fs) => this.onFlightStateChange(fs));
  }

  endSession(): void {
    this.unsubLap?.();
    this.unsubFlight?.();
    this.unsubLap = null;
    this.unsubFlight = null;
    this.sessionId = null;
    this.lapTimes = [];
    this.setState({ ...INITIAL_STATE });
  }

  private onLap(crossing: LapCrossing): void {
    // Skip first crossing after each off->* transition (holeshot equivalent)
    if (this.skipNextCrossing) {
      this.skipNextCrossing = false;
      return;
    }

    const lapTime = crossing.lapTime;
    this.lapTimes.push(lapTime);
    const avg = this.computeBaseline();

    const cur = this.state;

    if (cur.phase === "warmup") {
      const completed = cur.warmupLapsCompleted + 1;
      if (completed >= cur.warmupLapsRequired) {
        const targets = this.computeTargetLapTimes(avg);
        this.setState({
          ...cur,
          phase: "active",
          warmupLapsCompleted: completed,
          runningAverage: avg,
          targetLevel: 0,
          targetLapTimes: targets,
          consecutiveOnTarget: 0,
          lastLapTime: lapTime,
        });
        this.recordLevelEvent("lap", 0, avg, lapTime);
        const s = this.getSettings();
        announceLevel(0, s.ttsVoice, s.ttsRate, this.describeRange(0, avg));
      } else {
        this.setState({
          ...cur,
          warmupLapsCompleted: completed,
          runningAverage: avg,
          lastLapTime: lapTime,
        });
      }
      return;
    }

    if (cur.phase !== "active") return;

    const s = this.getSettings();
    const targets = this.computeTargetLapTimes(avg);
    let level = cur.targetLevel;
    let consecutive = cur.consecutiveOnTarget;

    // Check if lap fits current target range
    const miss = this.lapMissDirection(lapTime, avg, level);
    if (miss === null) {
      consecutive += 1;
      playDing();
    } else {
      speak(miss, s.ttsVoice, s.ttsRate);
    }

    // Level up check
    if (consecutive >= s.consecutiveLapsToLevelUp && level < 2) {
      level = (level + 1) as SpeedLevel;
      consecutive = 0;
    }

    // Random level down
    if (level > -2 && Math.random() * 100 < s.levelDownChancePct) {
      level = (level - 1) as SpeedLevel;
      consecutive = 0;
    }

    const levelChanged = level !== cur.targetLevel;
    this.setState({
      ...cur,
      runningAverage: avg,
      targetLevel: level,
      targetLapTimes: targets,
      consecutiveOnTarget: consecutive,
      lastLapTime: lapTime,
    });
    if (levelChanged) {
      this.recordLevelEvent("lap", level, avg, lapTime);
      announceLevel(level, s.ttsVoice, s.ttsRate, this.describeRange(level, avg));
    }
  }

  private onFlightStateChange(fs: FlightState): void {
    const s = this.getSettings();
    const stateWords: Record<string, string> = {
      prepare: "prepare",
      flying: "liftoff",
      landed: "land",
      crashed: "crash",
    };
    const word = stateWords[fs];
    if (word) speak(word, s.ttsVoice, s.ttsRate);

    if (fs === "off") {
      this.skipNextCrossing = true;
      return;
    }

    if (fs === "crashed") {
      this.skipNextCrossing = true;
    }

    if (fs !== "crashed") return;
    const cur = this.state;
    if (cur.phase !== "active") return;
    if (cur.targetLevel <= -2) return;

    const newLevel = (cur.targetLevel - 1) as SpeedLevel;
    this.setState({
      ...cur,
      targetLevel: newLevel,
      consecutiveOnTarget: 0,
    });
    this.recordLevelEvent("crash", newLevel, cur.runningAverage, null);
    announceLevel(newLevel, s.ttsVoice, s.ttsRate, this.describeRange(newLevel, cur.runningAverage));
  }

  private async recordLevelEvent(
    trigger: "lap" | "crash",
    targetLevel: SpeedLevel,
    runningAverage: number,
    lapTime: number | null,
  ): Promise<void> {
    if (this.sessionId == null) return;
    const flight = await db.flights
      .where("sessionId")
      .equals(this.sessionId)
      .last();
    if (!flight?.id) return;
    await db.svLevelEvents.add({
      flightId: flight.id,
      timestamp: new Date(),
      targetLevel,
      runningAverage,
      lapTime,
      trigger,
    });
  }

  private describeRange(level: SpeedLevel, avg: number): string {
    const s = this.getSettings();
    const innerFast = avg * (1 - s.svInnerFastPct / 100);
    const innerSlow = avg * (1 + s.svInnerSlowPct / 100);
    const outerFast = avg * (1 - s.svOuterFastPct / 100);
    const outerSlow = avg * (1 + s.svOuterSlowPct / 100);
    const fmt = (ms: number) => (ms / 1000).toFixed(1);

    switch (level) {
      case 2:
        return `faster than ${fmt(outerFast)}`;
      case 1:
        return `from ${fmt(outerFast)} to ${fmt(innerFast)}`;
      case 0:
        return `from ${fmt(innerFast)} to ${fmt(innerSlow)}`;
      case -1:
        return `from ${fmt(innerSlow)} to ${fmt(outerSlow)}`;
      case -2:
        return `slower than ${fmt(outerSlow)}`;
    }
  }

  private computeBaseline(): number {
    if (this.lapTimes.length === 0) return 0;
    const sorted = [...this.lapTimes].sort((a, b) => a - b);
    const pct = this.getSettings().svBaselinePct;
    const count = Math.max(1, Math.ceil(sorted.length * pct / 100));
    const fastest = sorted.slice(0, count);
    return fastest.reduce((a, b) => a + b, 0) / fastest.length;
  }

  computeTargetLapTimes(avg: number): TargetLapTimes {
    const s = this.getSettings();
    return {
      level2: avg * (1 - s.svOuterFastPct / 100),
      level1: avg * (1 - s.svInnerFastPct / 100),
      level0: [avg * (1 - s.svInnerFastPct / 100), avg * (1 + s.svInnerSlowPct / 100)],
      levelMinus1: avg * (1 + s.svOuterSlowPct / 100),
      levelMinus2: avg * (1 + s.svOuterSlowPct / 100),
    };
  }

  /** Returns null if on-target, "too fast" or "too slow" otherwise. */
  private lapMissDirection(lapTime: number, avg: number, level: SpeedLevel): string | null {
    const s = this.getSettings();
    const innerFastBound = avg * (1 - s.svInnerFastPct / 100);
    const innerSlowBound = avg * (1 + s.svInnerSlowPct / 100);
    const outerFastBound = avg * (1 - s.svOuterFastPct / 100);
    const outerSlowBound = avg * (1 + s.svOuterSlowPct / 100);

    let low: number;
    let high: number;
    switch (level) {
      case 2:
        // Only upper bound: anything below outerFastBound is on-target
        return lapTime < outerFastBound ? null : "too slow";
      case 1:
        low = outerFastBound; high = innerFastBound; break;
      case 0:
        low = innerFastBound; high = innerSlowBound; break;
      case -1:
        low = innerSlowBound; high = outerSlowBound; break;
      case -2:
        // Only lower bound: anything above outerSlowBound is on-target
        return lapTime > outerSlowBound ? null : "too fast";
    }
    if (lapTime < low) return "too fast";
    if (lapTime > high) return "too slow";
    return null;
  }

  private lapFitsCurrentTarget(lapTime: number, avg: number, level: SpeedLevel): boolean {
    const s = this.getSettings();
    const innerFastBound = avg * (1 - s.svInnerFastPct / 100);
    const innerSlowBound = avg * (1 + s.svInnerSlowPct / 100);
    const outerFastBound = avg * (1 - s.svOuterFastPct / 100);
    const outerSlowBound = avg * (1 + s.svOuterSlowPct / 100);

    switch (level) {
      case 2:
        return lapTime < outerFastBound;
      case 1:
        return lapTime >= outerFastBound && lapTime < innerFastBound;
      case 0:
        return lapTime >= innerFastBound && lapTime <= innerSlowBound;
      case -1:
        return lapTime > innerSlowBound && lapTime <= outerSlowBound;
      case -2:
        return lapTime > outerSlowBound;
    }
  }
}
