import type { SocketStatus } from "../app";

interface Props {
  address: string;
  onAddressChange: (address: string) => void;
  username: string;
  onUsernameChange: (username: string) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  status: SocketStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}

const statusLabel: Record<SocketStatus, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting...",
  connected: "Connected",
  error: "Error",
};

const statusColor: Record<SocketStatus, string> = {
  disconnected: "grey",
  connecting: "orange",
  connected: "green",
  error: "red",
};

export function RotorhazardConnect({ address, onAddressChange, username, onUsernameChange, password, onPasswordChange, status, onConnect, onDisconnect }: Props) {
  const isConnected = status === "connected";
  const isBusy = status === "connecting";
  const fieldsDisabled = isConnected || isBusy;

  return (
    <article>
      <header>RotorHazard Connection</header>
      <fieldset role="group">
        <input
          type="text"
          value={address}
          onInput={(e) => onAddressChange((e.target as HTMLInputElement).value)}
          placeholder="http://192.168.1.100:5000"
          disabled={fieldsDisabled}
        />
        {isConnected ? (
          <button class="secondary" onClick={onDisconnect}>
            Disconnect
          </button>
        ) : (
          <button onClick={onConnect} disabled={isBusy || !address}>
            {isBusy ? "Connecting..." : "Connect"}
          </button>
        )}
      </fieldset>
      <fieldset role="group">
        <input
          type="text"
          value={username}
          onInput={(e) => onUsernameChange((e.target as HTMLInputElement).value)}
          placeholder="Username"
          disabled={fieldsDisabled}
        />
        <input
          type="password"
          value={password}
          onInput={(e) => onPasswordChange((e.target as HTMLInputElement).value)}
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
