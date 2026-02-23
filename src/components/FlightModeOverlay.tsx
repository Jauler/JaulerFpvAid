interface Props {
  mode: string;
}

export function FlightModeOverlay({ mode }: Props) {
  return (
    <div
      style={{
        padding: "4px 10px",
        border: "1px solid var(--pico-muted-border-color)",
        borderRadius: "4px",
        fontSize: "0.85rem",
        lineHeight: 1,
      }}
    >
      {mode}
    </div>
  );
}
