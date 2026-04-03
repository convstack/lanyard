import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/users/$userId/ban")({
	server: {
		handlers: {
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { userId: string };
			}) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser || authedUser.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { user, session: sessionTable } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [existing] = await db
					.select({ id: user.id })
					.from(user)
					.where(eq(user.id, params.userId))
					.limit(1);

				if (!existing) {
					return new Response(JSON.stringify({ error: "User not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Ban the user
				await db
					.update(user)
					.set({ banned: true, updatedAt: new Date() })
					.where(eq(user.id, params.userId));

				// Revoke all their sessions
				await db
					.delete(sessionTable)
					.where(eq(sessionTable.userId, params.userId));

				// Revoke OAuth2 tokens and notify services
				const { revokeUserTokens, propagateLogout } = await import(
					"~/server/services/logout-propagation"
				);
				await revokeUserTokens(params.userId);
				await propagateLogout(params.userId);

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
