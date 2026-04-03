import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/clients/$clientId/actions")({
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

				const actions = [
					{
						label: "Delete Client",
						endpoint: `/api/admin/clients/${params.clientId}`,
						method: "DELETE",
						variant: "danger",
						confirm:
							"Are you sure you want to delete this OIDC client? This action cannot be undone.",
					},
				];

				return new Response(JSON.stringify({ actions }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
