import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/data-deletion/actions")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Get available actions for the user data deletion request
			 * auth: user
			 * response: 200
			 *   actions: array
			 */
			GET: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ actions: [] }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { dataDeletionRequest } = await import("~/db/schema");
				const { eq, and, inArray } = await import("drizzle-orm");

				const [active] = await db
					.select({ status: dataDeletionRequest.status })
					.from(dataDeletionRequest)
					.where(
						and(
							eq(dataDeletionRequest.userId, user.id),
							inArray(dataDeletionRequest.status, ["pending", "accepted"]),
						),
					)
					.limit(1);

				if (!active) {
					return new Response(JSON.stringify({ actions: [] }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}

				return new Response(
					JSON.stringify({
						actions: [
							{
								label: "Cancel Deletion Request",
								endpoint: "/api/user/data-deletion/cancel",
								method: "POST",
								variant: "default",
								confirm:
									"Cancel your account deletion request? Your account will return to normal.",
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
