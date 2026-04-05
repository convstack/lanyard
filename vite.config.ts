import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
    }),
    viteReact(),
    {
      name: "lanyard-dev-init",
      configureServer(server) {
        server.httpServer?.once("listening", async () => {
          try {
            const mod = await server.ssrLoadModule("~/server/services/self-register");
            await mod.registerLanyardAsService();
          } catch (err) {
            console.warn("Failed to self-register in dev:", err);
          }
          try {
            const runChecks = async () => {
              const hc = await server.ssrLoadModule("~/server/services/health-checker");
              await hc.runHealthChecks();
            };
            setTimeout(() => {
              runChecks();
              setInterval(runChecks, 60_000);
            }, 5_000);
            console.log("Health checker started (interval: 60s)");
          } catch (err) {
            console.warn("Failed to start health checker in dev:", err);
          }
        });
      },
    },
  ],
});
