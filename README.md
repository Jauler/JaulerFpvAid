# Jauler's FPV Aid

A real-time FPV drone racing training aid. Connects to your drone's ELRS receiver and a RotorHazard timing system to provide live telemetry, lap timing, crash detection, and structured speed variance training — all from your browser.

**[Try it live](https://aid.jauler.eu)**

## Requirements

- A browser with [Web Serial API](https://caniuse.com/web-serial) support (Chrome, Edge, Opera)
- An ExpressLRS receiver flashed with [ExpressLRS-sniffer](https://github.com/Jauler/ExpressLRS-sniffer) firmware, connected via USB/serial
- A [RotorHazard](https://github.com/RotorHazard/RotorHazard) timing system (optional, for lap timing)

## Features

- **ELRS telemetry via Web Serial** — connect directly to an ExpressLRS receiver at 420k baud for real-time CRSF data (battery, attitude, GPS, link stats, stick inputs, flight mode, and more)
- **RotorHazard integration** — receives lap crossing events over WebSocket for automated lap timing
- **Flight state detection** — automatic armed/disarmed/flying/landed/crashed state machine with configurable arm and turtle mode channels
- **Speed variance training** — structured drill with 5 speed levels around a baseline lap time, audio-guided level progression, and configurable band percentages
- **Live overlays** — animated drone icon, battery gauge, stick position indicators, real-time stats, and speed variance gauge
- **Session recording** — all flights, laps, crashes, battery samples, and stick inputs are stored locally in IndexedDB
- **Session review** — post-session charts including lap time trends, lap time distribution, crash timing, speed level progression, and per-flight battery/stick detail
- **Export/import** — full session data as JSON for backup or sharing
- **Audio feedback** — TTS announcements for flight state changes and level targets, audio cues for on-target laps
- **PWA** — installable, works offline after first load

## Connecting to RotorHazard

If your RotorHazard server runs on plain HTTP (no TLS), the browser will block the connection because the app is served over HTTPS. To allow it:

1. Click the lock/tune icon in the address bar
2. Go to **Site settings**
3. Find **Insecure content** and set it to **Allow**
4. Reload the page

This lets the app make non-encrypted connections to your local RotorHazard server.

## Tech Stack

[Vite](https://vite.dev/) + [Preact](https://preactjs.com/) + TypeScript, styled with [Pico CSS](https://picocss.com/). Data stored client-side via [Dexie](https://dexie.org/) (IndexedDB). Charts rendered with [Chart.js](https://www.chartjs.org/).

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Output goes to `dist/`. Deployed automatically to GitHub Pages on push to `main`.

## License

MIT
