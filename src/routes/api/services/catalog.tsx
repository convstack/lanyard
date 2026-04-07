import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit } from "~/lib/security/rate-limiter";
import {
	getAuthenticatedUser,
	getUserOrganizationIds,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/services/catalog")({
	server: {
		handlers: {
			/** @openapi
			 * summary: List visible services for the authenticated user
			 * auth: user
			 * response: 200
			 *   []: array of service objects (id, name, slug, type, description, version, baseUrl, uiManifest, status, lastHealthCheck, lastHealthStatus, visibility)
			 * error: 401 Unauthorized
			 * error: 429 Too many requests
			 */
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
						visibility: serviceCatalogEntry.visibility,
						requiredOrganizationId: serviceCatalogEntry.requiredOrganizationId,
					})
					.from(serviceCatalogEntry)
					.where(and(eq(serviceCatalogEntry.disabled, false)));

				// Filter by visibility based on user role
				const userRole = user.role ?? "user";
				const filtered = services.filter((s) => {
					if (s.status === "inactive" && userRole !== "admin") return false;
					if (s.visibility === "admin" && userRole !== "admin") return false;
					if (
						s.visibility === "staff" &&
						userRole !== "admin" &&
						userRole !== "staff"
					)
						return false;
					return true;
				});

				// Get user's org memberships for visibility filtering
				const userOrgIds =
					user.role === "admin" ? null : await getUserOrganizationIds(user.id);

				const visibleServices = filtered.filter((s) => {
					if (!s.requiredOrganizationId) return true;
					if (!userOrgIds) return true;
					return userOrgIds.includes(s.requiredOrganizationId);
				});

				const response = visibleServices.map(
					({ requiredOrganizationId: _dropped, ...rest }) => rest,
				);

				return new Response(JSON.stringify(response), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
