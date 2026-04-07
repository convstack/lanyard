import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Handle auth GET requests (Better Auth passthrough)
			 */
			GET: async ({ request }: { request: Request }) => {
				return await auth.handler(request);
			},
			/** @openapi
			 * summary: Handle auth POST requests (Better Auth passthrough)
			 */
			POST: async ({ request }: { request: Request }) => {
				return await auth.handler(request);
			},
		},
	},
});
