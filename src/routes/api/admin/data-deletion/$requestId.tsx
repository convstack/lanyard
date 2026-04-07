import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/data-deletion/$requestId")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Get data deletion request details
			 * auth: admin
			 * response: 200
			 *   fields: array
			 * error: 401 Unauthorized
			 * error: 404 Request not found
			 */
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
					.select()
					.from(dataDeletionRequest)
					.where(eq(dataDeletionRequest.id, params.requestId))
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "Request not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				if (found.status === "resolved") {
					const deletedAtStr = found.deletedAt
						? found.deletedAt.toISOString().replace("T", " ").slice(0, 16)
						: "—";

					return new Response(
						JSON.stringify({
							fields: [
								{ key: "id", label: "Request ID", value: found.id },
								{ key: "status", label: "Status", value: "Resolved" },
								{ key: "deletedAt", label: "Deleted At", value: deletedAtStr },
								{
									key: "note",
									label: "Note",
									value: "User data has been permanently deleted.",
								},
							],
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				}

				const createdAtStr = found.createdAt
					? found.createdAt.toISOString().replace("T", " ").slice(0, 16)
					: "—";

				const scheduledDeletionStr = found.scheduledDeletionAt
					? found.scheduledDeletionAt
							.toISOString()
							.replace("T", " ")
							.slice(0, 16)
					: "—";

				return new Response(
					JSON.stringify({
						fields: [
							{
								key: "userName",
								label: "User",
								value: found.userName ?? "",
							},
							{
								key: "userEmail",
								label: "Email",
								value: found.userEmail ?? "",
							},
							{ key: "reason", label: "Reason", value: found.reason },
							{
								key: "additionalInfo",
								label: "Additional Info",
								value: found.additionalInfo ?? "",
							},
							{ key: "status", label: "Status", value: found.status },
							{ key: "createdAt", label: "Requested", value: createdAtStr },
							{
								key: "scheduledDeletionAt",
								label: "Scheduled Deletion",
								value: scheduledDeletionStr,
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
