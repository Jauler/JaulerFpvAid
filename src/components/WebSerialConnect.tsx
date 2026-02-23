import type { ElrsState, ElrsConnectionStatus } from "../services/ElrsService";

interface Props {
  state: ElrsState;
  onConnect: () => void;
  onDisconnect: () => void;
}

const statusLabel: Record<ElrsConnectionStatus, string> = {
  disconnected: "Disconnected",
  connected: "Connected",
  unsupported: "Not supported",
};

const statusColor: Record<ElrsConnectionStatus, string> = {
  disconnected: "grey",
  connected: "green",
  unsupported: "red",
};

export function WebSerialConnect({ state, onConnect, onDisconnect }: Props) {
  const { status } = state;

  if (status === "unsupported") {
    return (
      <article>
        <header>ExpressLRS Receiver</header>
        <p>
          <small style={{ color: "red" }}>
            WebSerial is not supported in this browser. Use Chrome or Edge.
          </small>
        </p>
      </article>
    );
  }

  const isConnected = status === "connected";

  return (
    <article>
      <header>ExpressLRS Receiver</header>
      {isConnected ? (
        <button class="secondary" onClick={onDisconnect}>
          Disconnect Receiver
        </button>
      ) : (
        <button onClick={onConnect}>Connect Receiver</button>
      )}
      <footer>
        <small>
          Status: <span style={{ color: statusColor[status] }}>{statusLabel[status]}</span>
        </small>
      </footer>
    </article>
  );
}
