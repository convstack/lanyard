import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/clients/$clientId")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Get OAuth client details
			 * auth: admin
			 * response: 200
			 *   fields: array
			 * error: 401 Unauthorized
			 * error: 404 Client not found
			 */
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { clientId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || !hasAdminReadAccess(user.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { oauthApplication } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [found] = await db
					.select()
					.from(oauthApplication)
					.where(eq(oauthApplication.clientId, params.clientId))
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "Client not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				const createdAtStr = found.createdAt
					? found.createdAt.toISOString().replace("T", " ").slice(0, 16)
					: "";

				return new Response(
					JSON.stringify({
						fields: [
							{ key: "name", label: "Name", value: found.name ?? "" },
							{ key: "clientId", label: "Client ID", value: found.clientId },
							{ key: "type", label: "Type", value: found.type },
							{
								key: "redirectUris",
								label: "Redirect URIs",
								value: Array.isArray(found.redirectUris)
									? found.redirectUris.join(", ")
									: found.redirectUris || "",
							},
							{
								key: "disabled",
								label: "Disabled",
								value: found.disabled ?? false,
							},
							{ key: "createdAt", label: "Created", value: createdAtStr },
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

			/** @openapi
			 * summary: Update an OAuth client
			 * auth: admin
			 * body:
			 *   name: string - Client name
			 *   redirectUris: string - Redirect URLs
			 *   type: string - Client type
			 * response: 200
			 *   success: boolean
			 * error: 401 Unauthorized
			 */
			PUT: async ({
				request,
				params,
			}: {
				request: Request;
				params: { clientId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const body = await request.json();
				const { db } = await import("~/db");
				const { oauthApplication } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const updates: Record<string, unknown> = {
					updatedAt: new Date(),
				};
				if (typeof body.name === "string" && body.name)
					updates.name = body.name;
				if (typeof body.redirectUris === "string" && body.redirectUris)
					updates.redirectUris = body.redirectUris
						.split(",")
						.map((u: string) => u.trim());
				if (typeof body.type === "string" && body.type)
					updates.type = body.type;

				await db
					.update(oauthApplication)
					.set(updates)
					.where(eq(oauthApplication.clientId, params.clientId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},

			/** @openapi
			 * summary: Delete an OAuth client
			 * auth: admin
			 * response: 200
			 *   success: boolean
			 * error: 401 Unauthorized
			 * error: 404 Client not found
			 */
			DELETE: async ({
				request,
				params,
			}: {
				request: Request;
				params: { clientId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { oauthApplication } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [found] = await db
					.select({ id: oauthApplication.id })
					.from(oauthApplication)
					.where(eq(oauthApplication.clientId, params.clientId))
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "Client not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				await db
					.delete(oauthApplication)
					.where(eq(oauthApplication.clientId, params.clientId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
