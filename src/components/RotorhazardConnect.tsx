import type { RhState, RhConfig, RhConnectionStatus } from "../services/RotorhazardService";

interface Props {
  state: RhState;
  onConfigChange: (partial: Partial<RhConfig>) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

const statusLabel: Record<RhConnectionStatus, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting...",
  connected: "Connected",
  reconnecting: "Reconnecting...",
  error: "Error",
};

const statusColor: Record<RhConnectionStatus, string> = {
  disconnected: "grey",
  connecting: "orange",
  connected: "green",
  reconnecting: "orange",
  error: "red",
};

export function RotorhazardConnect({ state, onConfigChange, onConnect, onDisconnect }: Props) {
  const { status, config } = state;
  const isConnected = status === "connected";
  const isBusy = status === "connecting";
  const fieldsDisabled = isConnected || isBusy;

  return (
    <article>
      <header>RotorHazard Connection</header>
      <fieldset role="group">
        <input
          type="text"
          value={config.address}
          onInput={(e) => onConfigChange({ address: (e.target as HTMLInputElement).value })}
          placeholder="http://192.168.1.100:5000"
          disabled={fieldsDisabled}
        />
        {isConnected ? (
          <button class="secondary" onClick={onDisconnect}>
            Disconnect
          </button>
        ) : (
          <button onClick={onConnect} disabled={isBusy || !config.address}>
            {isBusy ? "Connecting..." : "Connect"}
          </button>
        )}
      </fieldset>
      <fieldset role="group">
        <input
          type="text"
          value={config.username}
          onInput={(e) => onConfigChange({ username: (e.target as HTMLInputElement).value })}
          placeholder="Username"
          disabled={fieldsDisabled}
        />
        <input
          type="password"
          value={config.password}
          onInput={(e) => onConfigChange({ password: (e.target as HTMLInputElement).value })}
          placeholder="Password"
          disabled={fieldsDisabled}
        />
      </fieldset>
      <footer>
        <small>
          Status: <span style={{ color: statusColor[status] }}>{statusLabel[status]}</span>
        </small>
      </footer>
    </article>
  );
}
