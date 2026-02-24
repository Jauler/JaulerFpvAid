import type { RhState, RhConfig } from "../services/RotorhazardService";
import type { ElrsState } from "../services/ElrsService";
import { RotorhazardConnect } from "./RotorhazardConnect";
import { WebSerialConnect } from "./WebSerialConnect";
import type { Settings } from "../settings";

interface Props {
  settings: Settings;
  channels: number[] | null;
  rhState: RhState;
  elrsState: ElrsState;
  onRhConfigChange: (partial: Partial<RhConfig>) => void;
  onRhConnect: () => void;
  onRhDisconnect: () => void;
  onElrsConnect: () => void;
  onElrsDisconnect: () => void;
  onSettingChange: (partial: Partial<Settings>) => void;
  onBack: () => void;
}

const AUX_CHANNELS = Array.from({ length: 12 }, (_, i) => ({
  label: `AUX${i + 1}`,
  value: i + 4,
}));

function ModeRangeSection({
  title,
  channel,
  rangeMin,
  rangeMax,
  liveValue,
  onChannelChange,
  onRangeMinChange,
  onRangeMaxChange,
}: {
  title: string;
  channel: number;
  rangeMin: number;
  rangeMax: number;
  liveValue: number | null;
  onChannelChange: (ch: number) => void;
  onRangeMinChange: (v: number) => void;
  onRangeMaxChange: (v: number) => void;
}) {
  return (
    <article>
      <header>{title}</header>

      <label>
        Channel
        <select
          value={channel}
          onChange={(e) => onChannelChange(Number((e.target as HTMLSelectElement).value))}
        >
          {AUX_CHANNELS.map((ch) => (
            <option key={ch.value} value={ch.value}>
              {ch.label}
            </option>
          ))}
        </select>
      </label>

      <div class="grid">
        <label>
          Range min
          <input
            key={rangeMin}
            type="number"
            min={988}
            max={2012}
            defaultValue={rangeMin}
            onBlur={(e) => {
              const v = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(v)) onRangeMinChange(v);
            }}
          />
        </label>
        <label>
          Range max
          <input
            key={rangeMax}
            type="number"
            min={988}
            max={2012}
            defaultValue={rangeMax}
            onBlur={(e) => {
              const v = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(v)) onRangeMaxChange(v);
            }}
          />
        </label>
      </div>

      <small>
        Current value: {liveValue != null ? liveValue : "—"}
      </small>
    </article>
  );
}

export function SettingsScreen({
  settings,
  channels,
  rhState,
  elrsState,
  onRhConfigChange,
  onRhConnect,
  onRhDisconnect,
  onElrsConnect,
  onElrsDisconnect,
  onSettingChange,
  onBack,
}: Props) {
  return (
    <main class="container">
      <h1>Settings</h1>

      <RotorhazardConnect
        state={rhState}
        onConfigChange={onRhConfigChange}
        onConnect={onRhConnect}
        onDisconnect={onRhDisconnect}
      />

      <WebSerialConnect
        state={elrsState}
        onConnect={onElrsConnect}
        onDisconnect={onElrsDisconnect}
      />

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

      <ModeRangeSection
        title="Arm"
        channel={settings.armChannel}
        rangeMin={settings.armRangeMin}
        rangeMax={settings.armRangeMax}
        liveValue={channels ? channels[settings.armChannel] ?? null : null}
        onChannelChange={(ch) => onSettingChange({ armChannel: ch })}
        onRangeMinChange={(v) => onSettingChange({ armRangeMin: v })}
        onRangeMaxChange={(v) => onSettingChange({ armRangeMax: v })}
      />

      <ModeRangeSection
        title="Turtle Mode"
        channel={settings.turtleChannel}
        rangeMin={settings.turtleRangeMin}
        rangeMax={settings.turtleRangeMax}
        liveValue={channels ? channels[settings.turtleChannel] ?? null : null}
        onChannelChange={(ch) => onSettingChange({ turtleChannel: ch })}
        onRangeMinChange={(v) => onSettingChange({ turtleRangeMin: v })}
        onRangeMaxChange={(v) => onSettingChange({ turtleRangeMax: v })}
      />

      <button class="secondary" onClick={onBack}>
        Back
      </button>
    </main>
  );
}
