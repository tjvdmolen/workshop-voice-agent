import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// The client builds into client/dist, which the Worker serves via [assets].
// During local dev, `vite` proxies /ws to the running `wrangler dev` instance
// so the WebSocket pipeline works without deploying.
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/ws": {
        target: "ws://localhost:8787",
        ws: true,
      },
    },
  },
});
