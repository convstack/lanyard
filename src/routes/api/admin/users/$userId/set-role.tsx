import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

const VALID_ROLES = ["user", "staff", "admin"];

export const Route = createFileRoute("/api/admin/users/$userId/set-role")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Set a user role
			 * auth: admin
			 * query:
			 *   role: string (required) - New role (user, staff, or admin)
			 * response: 200
			 *   success: boolean
			 * error: 400 Invalid role
			 * error: 401 Unauthorized
			 */
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

				const url = new URL(request.url);
				const newRole = url.searchParams.get("role");

				if (!newRole || !VALID_ROLES.includes(newRole)) {
					return new Response(
						JSON.stringify({
							error: "Invalid role. Must be: user, staff, or admin",
						}),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}

				const { db } = await import("~/db");
				const { user } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				await db
					.update(user)
					.set({ role: newRole, updatedAt: new Date() })
					.where(eq(user.id, params.userId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
