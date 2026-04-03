import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/data-deletion/$requestId/actions",
)({
	server: {
		handlers: {
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { requestId: string };
			}) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser || !hasAdminReadAccess(authedUser.role)) {
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
						status: dataDeletionRequest.status,
						scheduledDeletionAt: dataDeletionRequest.scheduledDeletionAt,
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

				const actions: Array<{
					label: string;
					endpoint: string;
					method: string;
					variant?: string;
					confirm?: string;
				}> = [];

				if (found.status === "pending") {
					actions.push({
						label: "Accept",
						endpoint: `/api/admin/data-deletion/${params.requestId}/accept`,
						method: "POST",
						confirm:
							"Accept this deletion request and schedule it for 30 days from now?",
					});
					actions.push({
						label: "Decline",
						endpoint: `/api/admin/data-deletion/${params.requestId}/decline`,
						method: "POST",
						variant: "danger",
						confirm: "Decline this deletion request?",
					});
				} else if (found.status === "accepted") {
					const isReady =
						found.scheduledDeletionAt !== null &&
						found.scheduledDeletionAt <= new Date();

					if (isReady) {
						actions.push({
							label: "Execute Now",
							endpoint: `/api/admin/data-deletion/${params.requestId}/execute`,
							method: "POST",
							variant: "danger",
							confirm: "Execute deletion immediately? This cannot be undone.",
						});
					}
				}

				return new Response(JSON.stringify({ actions }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
