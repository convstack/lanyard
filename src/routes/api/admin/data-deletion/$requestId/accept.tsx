import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/data-deletion/$requestId/accept",
)({
	server: {
		handlers: {
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { requestId: string };
			}) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser || authedUser.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { dataDeletionRequest } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [found] = await db
					.select({
						id: dataDeletionRequest.id,
						status: dataDeletionRequest.status,
					})
					.from(dataDeletionRequest)
					.where(eq(dataDeletionRequest.id, params.requestId))
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "Request not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				if (found.status !== "pending") {
					return new Response(
						JSON.stringify({ error: "Request is not in pending status" }),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				const now = new Date();
				const scheduledDeletionAt = new Date(now);
				scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 30);

				await db
					.update(dataDeletionRequest)
					.set({
						status: "accepted",
						scheduledDeletionAt,
						reviewedBy: authedUser.id,
						reviewedAt: now,
						updatedAt: now,
					})
					.where(eq(dataDeletionRequest.id, params.requestId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
