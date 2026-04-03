import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/clients/$clientId")({
	server: {
		handlers: {
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
								key: "redirectUrls",
								label: "Redirect URLs",
								value: found.redirectUrls,
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
