import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/fitness/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg"],
      workbox: {
        // Force the new service worker to activate immediately
        skipWaiting: true,
        clientsClaim: true,
        // Use NetworkFirst for JS/CSS so the latest version is always fetched
        runtimeCaching: [
          {
            urlPattern: /\.(?:js|css)$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "app-assets",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }, // 1 hour
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 1 week
            },
          },
        ],
      },
      manifest: {
        name: "Workout Tracker",
        short_name: "Lifts",
        description: "Local-first workout logger.",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/fitness/",
        scope: "/fitness/",
        icons: [
          {
            src: "icons/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icons/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
