import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/data-deletion")({
	server: {
		handlers: {
			/** @openapi
			 * summary: List all data deletion requests
			 * auth: admin
			 * response: 200
			 *   columns: array
			 *   rows: array
			 * error: 401 Unauthorized
			 */
			GET: async ({ request }: { request: Request }) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser || !hasAdminReadAccess(authedUser.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { dataDeletionRequest } = await import("~/db/schema");
				const { desc } = await import("drizzle-orm");

				const requests = await db
					.select()
					.from(dataDeletionRequest)
					.orderBy(desc(dataDeletionRequest.createdAt))
					.limit(200);

				const rows = requests.map((r) => ({
					id: r.id,
					userName:
						r.status === "resolved" ? "Deleted User" : (r.userName ?? ""),
					userEmail: r.status === "resolved" ? "—" : (r.userEmail ?? ""),
					reason: r.reason,
					status: r.status,
					createdAt: r.createdAt
						? r.createdAt.toISOString().replace("T", " ").slice(0, 16)
						: "",
					_link: `/data-deletion/${r.id}`,
				}));

				const topBar = {
					breadcrumbs: [{ label: "Data Deletion" }],
				};

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "userName", label: "User" },
							{ key: "userEmail", label: "Email" },
							{ key: "reason", label: "Reason" },
							{ key: "status", label: "Status" },
							{ key: "createdAt", label: "Requested" },
						],
						rows,
						topBar,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
