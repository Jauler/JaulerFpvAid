interface Props {
  mode: string;
}

export function FlightModeOverlay({ mode }: Props) {
  return (
    <div
      style={{
        padding: "8px 12px",
        border: "1px solid var(--pico-muted-border-color)",
        borderRadius: "4px",
        fontSize: "1.1rem",
        lineHeight: 1,
      }}
    >
      {mode}
    </div>
  );
}
