import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit } from "~/lib/security/rate-limiter";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/services/catalog")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const ip =
					request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
					"unknown";
				const rl = checkRateLimit(ip, {
					windowMs: 60_000,
					max: 30,
					keyPrefix: "catalog",
				});
				if (!rl.allowed) {
					return new Response(JSON.stringify({ error: "Too many requests" }), {
						status: 429,
						headers: { "Content-Type": "application/json" },
					});
				}

				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { serviceCatalogEntry } = await import("~/db/schema");
				const { eq, and } = await import("drizzle-orm");

				const services = await db
					.select({
						id: serviceCatalogEntry.id,
						name: serviceCatalogEntry.name,
						slug: serviceCatalogEntry.slug,
						type: serviceCatalogEntry.type,
						description: serviceCatalogEntry.description,
						version: serviceCatalogEntry.version,
						baseUrl: serviceCatalogEntry.baseUrl,
						uiManifest: serviceCatalogEntry.uiManifest,
						status: serviceCatalogEntry.status,
						lastHealthCheck: serviceCatalogEntry.lastHealthCheck,
						lastHealthStatus: serviceCatalogEntry.lastHealthStatus,
					})
					.from(serviceCatalogEntry)
					.where(and(eq(serviceCatalogEntry.disabled, false)));

				const filtered =
					user.role === "admin"
						? services
						: services.filter((s) => s.status !== "inactive");

				return new Response(JSON.stringify(filtered), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
