import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/services/$serviceId/delete")({
	server: {
		handlers: {
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

				const [existing] = await db
					.select({ id: serviceCatalogEntry.id })
					.from(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.id, params.serviceId))
					.limit(1);

				if (!existing) {
					return new Response(JSON.stringify({ error: "Service not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Cascade deletes audit log, permissions, role permissions
				await db
					.delete(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.id, params.serviceId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
