import { Subscribable } from "./Subscribable";

export interface Settings {
  theme: "auto" | "dark" | "light";
}

const STORAGE_KEY = "settings";

const defaults: Settings = { theme: "auto" };

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
