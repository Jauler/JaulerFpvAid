import type { Settings } from "../services/SettingsService";

interface Props {
  settings: Settings;
  onSettingChange: (partial: Partial<Settings>) => void;
  onBack: () => void;
}

export function SettingsScreen({ settings, onSettingChange, onBack }: Props) {
  return (
    <main class="container">
      <h1>Settings</h1>

      <article>
        <header>Appearance</header>
        <label>
          Theme
          <select
            value={settings.theme}
            onChange={(e) =>
              onSettingChange({ theme: (e.target as HTMLSelectElement).value as Settings["theme"] })
            }
          >
            <option value="auto">Auto (system)</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
      </article>

      <button class="secondary" onClick={onBack}>
        Back
      </button>
    </main>
  );
}
