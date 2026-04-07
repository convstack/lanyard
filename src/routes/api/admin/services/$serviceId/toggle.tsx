import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/services/$serviceId/toggle")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Toggle service enabled/disabled state
			 * auth: admin
			 * response: 200
			 *   success: boolean
			 *   disabled: boolean
			 * error: 401 Unauthorized
			 * error: 404 Service not found
			 */
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { serviceId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { serviceCatalogEntry } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [found] = await db
					.select({
						id: serviceCatalogEntry.id,
						disabled: serviceCatalogEntry.disabled,
					})
					.from(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.id, params.serviceId))
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "Service not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				await db
					.update(serviceCatalogEntry)
					.set({ disabled: !found.disabled, updatedAt: new Date() })
					.where(eq(serviceCatalogEntry.id, params.serviceId));

				return new Response(
					JSON.stringify({
						success: true,
						disabled: !found.disabled,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
