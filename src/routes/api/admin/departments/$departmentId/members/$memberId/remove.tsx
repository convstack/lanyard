import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/departments/$departmentId/members/$memberId/remove",
)({
	server: {
		handlers: {
			/** @openapi
			 * summary: Remove a member from a department (admin)
			 * auth: admin
			 * response: 200
			 *   success: boolean
			 * error: 401 Unauthorized
			 */
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { departmentId: string; memberId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { member } = await import("~/db/schema");
				const { and, eq } = await import("drizzle-orm");

				await db
					.delete(member)
					.where(
						and(
							eq(member.id, params.memberId),
							eq(member.organizationId, params.departmentId),
						),
					);

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
