import { createFileRoute } from "@tanstack/react-router";
import { getDepartmentBySlug } from "~/lib/department-utils";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/departments/$slug/teams/$teamId/delete",
)({
	server: {
		handlers: {
			/** @openapi
			 * summary: Delete a team from a department
			 * auth: user (department admin)
			 * response: 200
			 *   success: boolean
			 * error: 401 Unauthorized
			 * error: 403 Admin access required
			 */
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { slug: string; teamId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const dept = await getDepartmentBySlug(params.slug, user.id, user.role);
				if (!dept || dept.role !== "admin") {
					return new Response(
						JSON.stringify({ error: "Admin access required" }),
						{ status: 403, headers: { "Content-Type": "application/json" } },
					);
				}

				const { db } = await import("~/db");
				const { team } = await import("~/db/schema");
				const { eq, and } = await import("drizzle-orm");

				await db
					.delete(team)
					.where(
						and(
							eq(team.id, params.teamId),
							eq(team.organizationId, dept.departmentId),
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
