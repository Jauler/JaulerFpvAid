import { useState, useCallback, useRef } from "preact/hooks";
import { io, Socket } from "socket.io-client";
import { RotorhazardConnect } from "./components/RotorhazardConnect";
import { WebSerialConnect } from "./components/WebSerialConnect";

export type SocketStatus = "disconnected" | "connecting" | "connected" | "error";
export type SerialStatus = "disconnected" | "connected" | "unsupported";

export function App() {
  const [rhAddress, setRhAddress] = useState("http://192.168.1.100:5000");
  const [rhUsername, setRhUsername] = useState("");
  const [rhPassword, setRhPassword] = useState("");
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("disconnected");
  const socketRef = useRef<Socket | null>(null);

  const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
  const [serialStatus, setSerialStatus] = useState<SerialStatus>(
    "serial" in navigator ? "disconnected" : "unsupported"
  );

  const connectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    setSocketStatus("connecting");
    const s = io(rhAddress, {
      transports: ["websocket"],
      timeout: 5000,
      auth: { username: rhUsername, password: rhPassword },
    });

    s.on("connect", () => setSocketStatus("connected"));
    s.on("disconnect", () => setSocketStatus("disconnected"));
    s.on("connect_error", () => setSocketStatus("error"));

    socketRef.current = s;
  }, [rhAddress, rhUsername, rhPassword]);

  const disconnectSocket = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setSocketStatus("disconnected");
  }, []);

  const connectReceiver = useCallback(async () => {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 400000 });
      setSerialPort(port);
      setSerialStatus("connected");
    } catch {
      // User cancelled or error — stay disconnected
    }
  }, []);

  const disconnectReceiver = useCallback(async () => {
    if (serialPort) {
      await serialPort.close();
      setSerialPort(null);
      setSerialStatus("disconnected");
    }
  }, [serialPort]);

  return (
    <main class="container">
      <h1>Jauler's FPV Aid</h1>

      <RotorhazardConnect
        address={rhAddress}
        onAddressChange={setRhAddress}
        username={rhUsername}
        onUsernameChange={setRhUsername}
        password={rhPassword}
        onPasswordChange={setRhPassword}
        status={socketStatus}
        onConnect={connectSocket}
        onDisconnect={disconnectSocket}
      />

      <WebSerialConnect
        status={serialStatus}
        onConnect={connectReceiver}
        onDisconnect={disconnectReceiver}
      />

      <button
        disabled={socketStatus !== "connected" || serialStatus !== "connected"}
      >
        Start
      </button>
    </main>
  );
}
