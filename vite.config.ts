import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Jauler's FPV Aid",
        short_name: "FPV Aid",
        description: "FPV drone racing training aid",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
      },
    }),
  ],
});
