import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/data-deletion/cancel")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { dataDeletionRequest, user } = await import("~/db/schema");
				const { eq, and, inArray } = await import("drizzle-orm");

				const [activeRequest] = await db
					.select({ id: dataDeletionRequest.id })
					.from(dataDeletionRequest)
					.where(
						and(
							eq(dataDeletionRequest.userId, authedUser.id),
							inArray(dataDeletionRequest.status, ["pending", "accepted"]),
						),
					)
					.limit(1);

				if (!activeRequest) {
					return new Response(
						JSON.stringify({ error: "No active deletion request found." }),
						{
							status: 404,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				const now = new Date();

				await db
					.update(dataDeletionRequest)
					.set({ status: "cancelled", updatedAt: now })
					.where(eq(dataDeletionRequest.id, activeRequest.id));

				await db
					.update(user)
					.set({ deletionPending: false, updatedAt: now })
					.where(eq(user.id, authedUser.id));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
