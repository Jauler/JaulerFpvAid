interface Props {
  lap: number;
}

export function LapOverlay({ lap }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px 12px",
        border: "1px solid var(--pico-muted-color)",
        borderRadius: "4px",
        lineHeight: 1,
        height: "100%",
        boxSizing: "border-box",
        minWidth: "3.5rem",
      }}
    >
      <strong style={{ fontSize: "1.5rem" }}>{lap}</strong>
      <span style={{ fontSize: "0.65rem", marginTop: "2px", color: "var(--pico-muted-color)" }}>
        {lap === 1 ? "lap" : "laps"}
      </span>
    </div>
  );
}
