import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/sessions/$sessionId/revoke")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Revoke a specific user session
			 * auth: user
			 * response: 200
			 *   success: boolean
			 * error: 401 Unauthorized
			 * error: 404 Session not found
			 */
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { sessionId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { session: sessionTable } = await import("~/db/schema");
				const { and, eq } = await import("drizzle-orm");

				// Verify the session belongs to this user
				const [target] = await db
					.select({ id: sessionTable.id })
					.from(sessionTable)
					.where(
						and(
							eq(sessionTable.id, params.sessionId),
							eq(sessionTable.userId, user.id),
						),
					)
					.limit(1);

				if (!target) {
					return new Response(JSON.stringify({ error: "Session not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Delete the session directly
				await db
					.delete(sessionTable)
					.where(eq(sessionTable.id, params.sessionId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
