import { useMemo, useCallback, useState, useRef, useEffect } from "preact/hooks";
import { RotorhazardService, type RhConfig } from "./services/RotorhazardService";
import { ElrsService } from "./services/ElrsService";
import { TelemetryService } from "./services/TelemetryService";
import { loadSettings, saveSettings, applyTheme, type Settings } from "./settings";
import { useService, useServiceThrottled } from "./hooks/useService";
import { ArmedProbe } from "./probes/ArmedProbe";
import { FlightProbe } from "./probes/FlightProbe";
import { BatteryTracker } from "./trackers/BatteryTracker";
import { CrashTracker } from "./trackers/CrashTracker";
import { StickTracker } from "./trackers/StickTracker";
import { MainScreen } from "./components/MainScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { SessionList } from "./components/SessionList";
import { SessionReviewScreen } from "./components/SessionReviewScreen";
import { FlightDetailScreen } from "./components/FlightDetailScreen";

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
  const [screen, setScreen] = useState<"setup" | "main" | "settings" | "review" | "flight-detail">("setup");
  const [settings, setSettings] = useState(() => {
    const initial = loadSettings();
    applyTheme(initial.theme);
    return initial;
  });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const armedProbe = useMemo(
    () => new ArmedProbe(telemetry.channels, telemetry.flightMode, () => settingsRef.current),
    [telemetry],
  );

  const flightProbe = useMemo(
    () => new FlightProbe(armedProbe, telemetry.channels, () => settingsRef.current),
    [armedProbe, telemetry],
  );

  const batteryTracker = useMemo(
    () => new BatteryTracker(armedProbe, telemetry.battery),
    [armedProbe, telemetry],
  );

  const crashTracker = useMemo(
    () => new CrashTracker(flightProbe),
    [flightProbe],
  );

  const stickTracker = useMemo(
    () => new StickTracker(armedProbe, telemetry.channels),
    [armedProbe, telemetry],
  );

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [reviewFlightId, setReviewFlightId] = useState<number | null>(null);

  const rhState = useService(rh);
  const elrsState = useService(elrs);
  const channelsState = useServiceThrottled(telemetry.channels);

  const handleConfigChange = useCallback(
    (partial: Partial<RhConfig>) => rh.updateConfig(partial),
    [rh],
  );
  const handleRhConnect = useCallback(() => rh.connect(), [rh]);
  const handleRhDisconnect = useCallback(() => rh.disconnect(), [rh]);

  const handleElrsConnect = useCallback(() => elrs.connect(), [elrs]);
  const handleElrsDisconnect = useCallback(() => elrs.disconnect(), [elrs]);

  useEffect(() => {
    rh.setCallsign(settings.callsign);
  }, [settings.callsign, rh]);

  // Start/stop telemetry in response to ELRS connection changes.
  // Only active once the user has left the setup screen.
  useEffect(() => {
    if (screen === "setup") return;

    if (elrsState.status === "connected" && !telemetry.isRunning()) {
      const readable = elrs.getReadable();
      if (readable) telemetry.start(readable);
    } else if (elrsState.status !== "connected" && telemetry.isRunning()) {
      telemetry.stop();
    }
  }, [elrsState.status, screen, elrs, telemetry]);

  const handleStart = useCallback(
    (sessionId: number) => {
      saveConfig(rh.state.config);
      rh.connect();
      elrs.connect();
      batteryTracker.resumeSession(sessionId);
      crashTracker.startSession(sessionId);
      stickTracker.resumeSession(sessionId);
      setSessionId(sessionId);
      setScreen("main");
    },
    [rh, elrs, batteryTracker, crashTracker, stickTracker],
  );

  const handleStop = useCallback(async () => {
    crashTracker.endSession();
    await stickTracker.endSession();
    await batteryTracker.endSession();
    setSessionId(null);
    telemetry.stop();
    setScreen("setup");
  }, [telemetry, batteryTracker, crashTracker, stickTracker]);

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

  if (screen === "flight-detail" && reviewFlightId != null) {
    return (
      <FlightDetailScreen
        key={reviewFlightId}
        flightId={reviewFlightId}
        onBack={() => {
          setReviewFlightId(null);
          setScreen("review");
        }}
      />
    );
  }

  if (screen === "review" && sessionId != null) {
    return (
      <SessionReviewScreen
        sessionId={sessionId}
        onBack={() => setScreen("main")}
        onSelectFlight={(flightId) => {
          setReviewFlightId(flightId);
          setScreen("flight-detail");
        }}
      />
    );
  }

  if (screen === "settings") {
    return (
      <SettingsScreen
        settings={settings}
        channels={channelsState.data?.channels ?? null}
        rhState={rhState}
        elrsState={elrsState}
        onRhConfigChange={handleConfigChange}
        onRhConnect={handleRhConnect}
        onRhDisconnect={handleRhDisconnect}
        onElrsConnect={handleElrsConnect}
        onElrsDisconnect={handleElrsDisconnect}
        onSettingChange={handleSettingsChange}
        onBack={() => setScreen("main")}
      />
    );
  }

  if (screen === "main") {
    return (
      <MainScreen
        rhState={rhState}
        rh={rh}
        elrsState={elrsState}
        telemetry={telemetry}
        armedProbe={armedProbe}
        flightProbe={flightProbe}
        sessionId={sessionId}
        onStop={handleStop}
        onOpenSettings={() => setScreen("settings")}
        onOpenReview={() => setScreen("review")}
      />
    );
  }

  return (
    <main class="container" style={{ maxWidth: "75vw" }}>
      <h1>Jauler's FPV Aid</h1>
      <SessionList onStart={handleStart} />
    </main>
  );
}
