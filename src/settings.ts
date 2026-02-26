export interface Settings {
  theme: "auto" | "dark" | "light";
  callsign: string;
  armChannel: number;
  armRangeMin: number;
  armRangeMax: number;
  turtleChannel: number;
  turtleRangeMin: number;
  turtleRangeMax: number;
  crashThrottlePct: number;
  warmupLaps: number;
  consecutiveLapsToLevelUp: number;
  levelDownChancePct: number;
  svInnerFastPct: number;
  svInnerSlowPct: number;
  svOuterFastPct: number;
  svOuterSlowPct: number;
  svBaselinePct: number;
  ttsVoice: string;
  ttsRate: number;
}

const STORAGE_KEY = "settings";

const defaults: Settings = {
  theme: "auto",
  callsign: "",
  armChannel: 4,
  armRangeMin: 1500,
  armRangeMax: 2012,
  turtleChannel: 5,
  turtleRangeMin: 1500,
  turtleRangeMax: 2012,
  crashThrottlePct: 25,
  warmupLaps: 10,
  consecutiveLapsToLevelUp: 3,
  levelDownChancePct: 0,
  svInnerFastPct: 7.5,
  svInnerSlowPct: 12,
  svOuterFastPct: 15,
  svOuterSlowPct: 30,
  svBaselinePct: 30,
  ttsVoice: "",
  ttsRate: 1.0,
};

export function applyTheme(theme: Settings["theme"]): void {
  if (theme === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    // ignore corrupt data
  }
  return defaults;
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
