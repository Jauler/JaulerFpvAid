import { Subscribable } from "./Subscribable";

export interface Settings {
  theme: "auto" | "dark" | "light";
  armChannel: number;
  armRangeMin: number;
  armRangeMax: number;
  turtleChannel: number;
  turtleRangeMin: number;
  turtleRangeMax: number;
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
};

function applyTheme(theme: Settings["theme"]): void {
  if (theme === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

export class SettingsService extends Subscribable<Settings> {
  constructor() {
    let initial = defaults;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) initial = { ...defaults, ...JSON.parse(raw) };
    } catch {
      // ignore corrupt data
    }
    super(initial);
    applyTheme(initial.theme);
  }

  update(partial: Partial<Settings>): void {
    const next = { ...this.state, ...partial };
    this.setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    applyTheme(next.theme);
  }
}
