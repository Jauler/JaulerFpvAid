import { useMemo, useCallback, useState } from "preact/hooks";
import { RotorhazardService, type RhConfig } from "./services/RotorhazardService";
import { ElrsService } from "./services/ElrsService";
import { useService } from "./hooks/useService";
import { RotorhazardConnect } from "./components/RotorhazardConnect";
import { WebSerialConnect } from "./components/WebSerialConnect";
import { MainScreen } from "./components/MainScreen";

export function App() {
  const rh = useMemo(() => new RotorhazardService(), []);
  const elrs = useMemo(() => new ElrsService(), []);

  const [screen, setScreen] = useState<"setup" | "main">("setup");

  const rhState = useService(rh);
  const elrsState = useService(elrs);

  const handleConfigChange = useCallback(
    (partial: Partial<RhConfig>) => rh.updateConfig(partial),
    [rh],
  );
  const handleRhConnect = useCallback(() => rh.connect(), [rh]);
  const handleRhDisconnect = useCallback(() => rh.disconnect(), [rh]);

  const handleElrsConnect = useCallback(() => elrs.connect(), [elrs]);
  const handleElrsDisconnect = useCallback(() => elrs.disconnect(), [elrs]);

  if (screen === "main") {
    return (
      <MainScreen
        rhState={rhState}
        elrsState={elrsState}
        onStop={() => setScreen("setup")}
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
        onClick={() => setScreen("main")}
      >
        Start
      </button>
    </main>
  );
}
