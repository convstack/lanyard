import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/departments/$departmentId/teams/$teamId/delete",
)({
	server: {
		handlers: {
			/** @openapi
			 * summary: Delete a team from a department (admin)
			 * auth: admin
			 * response: 200
			 *   success: boolean
			 * error: 401 Unauthorized
			 * error: 404 Team not found
			 */
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { departmentId: string; teamId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { team } = await import("~/db/schema");
				const { and, eq } = await import("drizzle-orm");

				const [existing] = await db
					.select({ id: team.id })
					.from(team)
					.where(
						and(
							eq(team.id, params.teamId),
							eq(team.organizationId, params.departmentId),
						),
					)
					.limit(1);

				if (!existing) {
					return new Response(JSON.stringify({ error: "Team not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				await db
					.delete(team)
					.where(
						and(
							eq(team.id, params.teamId),
							eq(team.organizationId, params.departmentId),
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
