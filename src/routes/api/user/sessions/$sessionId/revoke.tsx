import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/lib/auth";

export const Route = createFileRoute("/api/user/sessions/$sessionId/revoke")({
	server: {
		handlers: {
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { sessionId: string };
			}) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { session: sessionTable } = await import("~/db/schema");
				const { and, eq } = await import("drizzle-orm");

				const [targetSession] = await db
					.select({ id: sessionTable.id, token: sessionTable.token })
					.from(sessionTable)
					.where(
						and(
							eq(sessionTable.id, params.sessionId),
							eq(sessionTable.userId, session.user.id),
						),
					)
					.limit(1);

				if (!targetSession) {
					return new Response(JSON.stringify({ error: "Session not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				await auth.api.revokeSession({
					body: { token: targetSession.token },
					headers: request.headers,
				});

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
