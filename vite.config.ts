import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 3000,
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		{
			name: "lanyard-openapi",
			buildStart() {
				import("node:child_process").then(({ execSync }) => {
					try {
						execSync("bun run openapi:generate", { stdio: "inherit" });
					} catch {
						console.warn("Failed to generate OpenAPI spec");
					}
				});
			},
		},
		// RFC 8414: .well-known OAuth discovery endpoints
		// These are SERVER_ONLY in Better Auth and must be served manually
		{
			name: "lanyard-well-known",
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					const url = req.originalUrl || req.url || "";
					if (!url.startsWith("/.well-known/")) return next();

					Promise.all([
						server.ssrLoadModule("~/lib/auth"),
						server.ssrLoadModule("@better-auth/oauth-provider"),
					])
						.then(async ([authMod, providerMod]) => {
							const { auth } = authMod;
							let handler: ((req: Request) => Promise<Response>) | null =
								null;

							if (url.startsWith("/.well-known/oauth-authorization-server")) {
								handler = providerMod.oauthProviderAuthServerMetadata(auth);
							} else if (url.startsWith("/.well-known/openid-configuration")) {
								handler = providerMod.oauthProviderOpenIdConfigMetadata(auth);
							}

							if (!handler) return next();

							const response = await handler(
								new Request(`http://localhost:3000${url}`),
							);
							const body = await response.text();
							res.writeHead(response.status, {
								"Content-Type":
									response.headers.get("Content-Type") || "application/json",
								"Cache-Control": "public, max-age=3600",
							});
							res.end(body);
						})
						.catch(() => next());
				});
			},
		},
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
						const mod = await server.ssrLoadModule(
							"~/server/services/self-register",
						);
						await mod.registerLanyardAsService();
					} catch (err) {
						console.warn("Failed to self-register in dev:", err);
					}
					try {
						const runChecks = async () => {
							const hc = await server.ssrLoadModule(
								"~/server/services/health-checker",
							);
							await hc.runHealthChecks();
						};
						setTimeout(() => {
							runChecks();
							setInterval(runChecks, 60_000);
						}, 5_000);
						console.log("Health checker started (interval: 60s)");
					} catch (err) {
						console.warn(
							"Failed to start health checker in dev:",
							err,
						);
					}
				});
			},
		},
	],
});
