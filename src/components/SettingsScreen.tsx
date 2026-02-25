import { useState, useEffect } from "preact/hooks";
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

function AudioSection({
  settings,
  onSettingChange,
}: {
  settings: Settings;
  onSettingChange: (partial: Partial<Settings>) => void;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const update = () => setVoices(speechSynthesis.getVoices());
    update();
    speechSynthesis.addEventListener("voiceschanged", update);
    return () => speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  return (
    <article>
      <header>Audio</header>
      <label>
        TTS Voice
        <select
          value={settings.ttsVoice}
          onChange={(e) => onSettingChange({ ttsVoice: (e.target as HTMLSelectElement).value })}
        >
          <option value="">Default</option>
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </label>
      <label>
        Voice rate
        <input
          key={settings.ttsRate}
          type="number"
          min={0.5}
          max={2.0}
          step={0.1}
          defaultValue={settings.ttsRate}
          onBlur={(e) => {
            const v = Number((e.target as HTMLInputElement).value);
            if (!Number.isNaN(v)) onSettingChange({ ttsRate: v });
          }}
        />
      </label>
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
        <header>Pilot Identity</header>
        <label>
          Callsign
          <input
            type="text"
            value={settings.callsign}
            placeholder="e.g. PILOT1"
            onInput={(e) => onSettingChange({ callsign: (e.target as HTMLInputElement).value })}
          />
        </label>
        <small>
          Used to filter RotorHazard lap crossings to your node. Leave empty to receive all crossings.
        </small>
      </article>

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

      <AudioSection settings={settings} onSettingChange={onSettingChange} />

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

      <article>
        <header>Crash Detection</header>
        <label>
          Throttle threshold (%)
          <input
            key={settings.crashThrottlePct}
            type="number"
            min={0}
            max={100}
            defaultValue={settings.crashThrottlePct}
            onBlur={(e) => {
              const v = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(v)) onSettingChange({ crashThrottlePct: v });
            }}
          />
        </label>
        <small>
          Throttle must exceed this percentage to transition from armed to flying.
        </small>
      </article>

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

      <article>
        <header>Speed Variance Training</header>
        <label>
          Warmup laps
          <input
            key={settings.warmupLaps}
            type="number"
            min={1}
            defaultValue={settings.warmupLaps}
            onBlur={(e) => {
              const v = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(v)) onSettingChange({ warmupLaps: v });
            }}
          />
        </label>
        <label>
          Consecutive laps to level up
          <input
            key={settings.consecutiveLapsToLevelUp}
            type="number"
            min={1}
            defaultValue={settings.consecutiveLapsToLevelUp}
            onBlur={(e) => {
              const v = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(v)) onSettingChange({ consecutiveLapsToLevelUp: v });
            }}
          />
        </label>
        <label>
          Level down chance (%)
          <input
            key={settings.levelDownChancePct}
            type="number"
            min={0}
            max={100}
            defaultValue={settings.levelDownChancePct}
            onBlur={(e) => {
              const v = Number((e.target as HTMLInputElement).value);
              if (!Number.isNaN(v)) onSettingChange({ levelDownChancePct: v });
            }}
          />
        </label>
        <div class="grid">
          <label>
            Inner fast band (%)
            <input
              key={settings.svInnerFastPct}
              type="number"
              min={0}
              max={100}
              defaultValue={settings.svInnerFastPct}
              onBlur={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                if (!Number.isNaN(v)) onSettingChange({ svInnerFastPct: v });
              }}
            />
          </label>
          <label>
            Inner slow band (%)
            <input
              key={settings.svInnerSlowPct}
              type="number"
              min={0}
              max={100}
              defaultValue={settings.svInnerSlowPct}
              onBlur={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                if (!Number.isNaN(v)) onSettingChange({ svInnerSlowPct: v });
              }}
            />
          </label>
        </div>
        <div class="grid">
          <label>
            Outer fast band (%)
            <input
              key={settings.svOuterFastPct}
              type="number"
              min={0}
              max={100}
              defaultValue={settings.svOuterFastPct}
              onBlur={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                if (!Number.isNaN(v)) onSettingChange({ svOuterFastPct: v });
              }}
            />
          </label>
          <label>
            Outer slow band (%)
            <input
              key={settings.svOuterSlowPct}
              type="number"
              min={0}
              max={100}
              defaultValue={settings.svOuterSlowPct}
              onBlur={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                if (!Number.isNaN(v)) onSettingChange({ svOuterSlowPct: v });
              }}
            />
          </label>
        </div>
      </article>

      <button class="secondary" style={{ marginBottom: "2rem" }} onClick={onBack}>
        Back
      </button>
    </main>
  );
}
