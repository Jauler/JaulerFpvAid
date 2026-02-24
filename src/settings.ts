export interface Settings {
  theme: "auto" | "dark" | "light";
  armChannel: number;
  armRangeMin: number;
  armRangeMax: number;
  turtleChannel: number;
  turtleRangeMin: number;
  turtleRangeMax: number;
  crashThrottlePct: number;
}

const STORAGE_KEY = "settings";

const defaults: Settings = {
  theme: "auto",
  armChannel: 4,
  armRangeMin: 1500,
  armRangeMax: 2012,
  turtleChannel: 5,
  turtleRangeMin: 1500,
  turtleRangeMax: 2012,
  crashThrottlePct: 25,
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
