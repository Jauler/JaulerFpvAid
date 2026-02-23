import { useMemo, useCallback, useState } from "preact/hooks";
import { RotorhazardService, type RhConfig } from "./services/RotorhazardService";
import { ElrsService } from "./services/ElrsService";
import { TelemetryService } from "./services/TelemetryService";
import { loadSettings, saveSettings, applyTheme, type Settings } from "./settings";
import { useService } from "./hooks/useService";
import { RotorhazardConnect } from "./components/RotorhazardConnect";
import { WebSerialConnect } from "./components/WebSerialConnect";
import { MainScreen } from "./components/MainScreen";
import { SettingsScreen } from "./components/SettingsScreen";

const STORAGE_KEY = "rh-config";

function loadSavedConfig(): Partial<RhConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupt data
  }
  return {};
}

function saveConfig(config: RhConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function App() {
  const rh = useMemo(() => {
    const service = new RotorhazardService();
    service.updateConfig(loadSavedConfig());
    return service;
  }, []);
  const elrs = useMemo(() => new ElrsService(), []);
  const telemetry = useMemo(() => new TelemetryService(), []);
  const [screen, setScreen] = useState<"setup" | "main" | "settings">("setup");
  const [settings, setSettings] = useState(() => {
    const initial = loadSettings();
    applyTheme(initial.theme);
    return initial;
  });

  const rhState = useService(rh);
  const elrsState = useService(elrs);
  const channelsState = useService(telemetry.channels);

  const handleConfigChange = useCallback(
    (partial: Partial<RhConfig>) => rh.updateConfig(partial),
    [rh],
  );
  const handleRhConnect = useCallback(() => rh.connect(), [rh]);
  const handleRhDisconnect = useCallback(() => rh.disconnect(), [rh]);

  const handleElrsConnect = useCallback(() => elrs.connect(), [elrs]);
  const handleElrsDisconnect = useCallback(() => elrs.disconnect(), [elrs]);

  const handleStart = useCallback(() => {
    saveConfig(rh.state.config);
    const readable = elrs.getReadable();
    if (readable) {
      telemetry.start(readable);
    }
    setScreen("main");
  }, [rh, elrs, telemetry]);

  const handleStop = useCallback(() => {
    telemetry.stop();
    setScreen("setup");
  }, [telemetry]);

  const handleSettingsChange = useCallback(
    (partial: Partial<Settings>) =>
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        saveSettings(next);
        applyTheme(next.theme);
        return next;
      }),
    [],
  );

  if (screen === "settings") {
    return (
      <SettingsScreen
        settings={settings}
        channels={channelsState.data?.channels ?? null}
        onSettingChange={handleSettingsChange}
        onBack={() => setScreen("main")}
      />
    );
  }

  if (screen === "main") {
    return (
      <MainScreen
        rhState={rhState}
        elrsState={elrsState}
        telemetry={telemetry}
        onStop={handleStop}
        onOpenSettings={() => setScreen("settings")}
      />
    );
  }

  return (
    <main class="container">
      <h1>Jauler's FPV Aid</h1>

      <RotorhazardConnect
        state={rhState}
        onConfigChange={handleConfigChange}
        onConnect={handleRhConnect}
        onDisconnect={handleRhDisconnect}
      />

      <WebSerialConnect
        state={elrsState}
        onConnect={handleElrsConnect}
        onDisconnect={handleElrsDisconnect}
      />

      <button
        disabled={rhState.status !== "connected" || elrsState.status !== "connected"}
        onClick={handleStart}
      >
        Start
      </button>
    </main>
  );
}
