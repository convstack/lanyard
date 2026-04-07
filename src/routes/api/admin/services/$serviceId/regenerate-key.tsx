import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/services/$serviceId/regenerate-key",
)({
	server: {
		handlers: {
			/** @openapi
			 * summary: Regenerate a service API key
			 * auth: admin
			 * response: 200
			 *   apiKey: string
			 *   message: string
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
				const { serviceCatalogEntry, serviceCatalogAuditLog } = await import(
					"~/db/schema"
				);
				const { eq } = await import("drizzle-orm");
				const { nanoid } = await import("nanoid");
				const { hash } = await import("bcryptjs");

				const [found] = await db
					.select({ id: serviceCatalogEntry.id })
					.from(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.id, params.serviceId))
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "Service not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				const apiKey = `sk_svc_${nanoid(32)}`;
				const apiKeyHash = await hash(apiKey, 10);
				const apiKeyPrefix = apiKey.slice(0, 12);

				await db
					.update(serviceCatalogEntry)
					.set({ apiKeyHash, apiKeyPrefix, updatedAt: new Date() })
					.where(eq(serviceCatalogEntry.id, params.serviceId));

				await db.insert(serviceCatalogAuditLog).values({
					id: nanoid(),
					serviceId: params.serviceId,
					action: "api_key_regenerated",
					details: { prefix: apiKeyPrefix },
					performedBy: user.id,
					createdAt: new Date(),
				});

				return new Response(
					JSON.stringify({
						apiKey,
						message:
							"Store this API key securely. The old key has been invalidated.",
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			},
		},
	},
});
