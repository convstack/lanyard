import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/data-deletion/$requestId/execute",
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
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				try {
					const { executeDataDeletion } = await import(
						"~/server/services/data-deletion-executor"
					);
					await executeDataDeletion(params.requestId);
					return new Response(
						JSON.stringify({ success: true, redirect: "/data-deletion" }),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (err) {
					const message =
						err instanceof Error ? err.message : "Deletion failed";
					return new Response(JSON.stringify({ error: message }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}
			},
		},
	},
});
