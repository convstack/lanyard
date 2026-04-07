import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/services")({
	server: {
		handlers: {
			/** @openapi
			 * summary: List all registered services
			 * auth: admin
			 * response: 200
			 *   columns: array
			 *   rows: array
			 *   total: number
			 * error: 401 Unauthorized
			 */
			GET: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user || !hasAdminReadAccess(user.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { serviceCatalogEntry } = await import("~/db/schema");
				const { desc, count } = await import("drizzle-orm");

				const [services, [total]] = await Promise.all([
					db
						.select({
							id: serviceCatalogEntry.id,
							name: serviceCatalogEntry.name,
							slug: serviceCatalogEntry.slug,
							type: serviceCatalogEntry.type,
							status: serviceCatalogEntry.status,
							disabled: serviceCatalogEntry.disabled,
							baseUrl: serviceCatalogEntry.baseUrl,
						})
						.from(serviceCatalogEntry)
						.orderBy(desc(serviceCatalogEntry.createdAt))
						.limit(200),
					db.select({ count: count() }).from(serviceCatalogEntry),
				]);

				const rows = services.map((s) => ({
					id: s.id,
					name: s.name,
					slug: s.slug,
					type: s.type,
					status: s.disabled ? "Disabled" : s.status,
					baseUrl: s.baseUrl,
				}));

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "name", label: "Name" },
							{ key: "slug", label: "Slug" },
							{ key: "type", label: "Type" },
							{ key: "status", label: "Status" },
							{ key: "baseUrl", label: "Base URL" },
						],
						rows,
						total: total?.count ?? 0,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
