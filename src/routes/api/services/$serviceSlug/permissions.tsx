import { createFileRoute } from "@tanstack/react-router";
import { resolveUserPermissions } from "~/lib/permission-resolver";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/services/$serviceSlug/permissions")({
	server: {
		handlers: {
			/**
			 * Resolve a user's effective permissions for a specific service.
			 * Called by the Dashboard proxy to populate X-User-Permissions header.
			 *
			 * Auth: Bearer token (OAuth2 access token)
			 */
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { serviceSlug: string };
			}) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const result = await resolveUserPermissions(
					authedUser.id,
					params.serviceSlug,
				);

				return new Response(JSON.stringify(result), {
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "private, max-age=120",
					},
				});
			},
		},
	},
});
