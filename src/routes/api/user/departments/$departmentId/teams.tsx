import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/user/departments/$departmentId/teams",
)({
	server: {
		handlers: {
			/** @openapi
			 * summary: List teams the current user belongs to in a department
			 * auth: user
			 * response: 200
			 *   columns: array
			 *   rows: array
			 *   total: number
			 * error: 401 Unauthorized
			 * error: 404 Department not found or not a member
			 */
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { departmentId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { member, team, teamMember } = await import("~/db/schema");
				const { eq, and } = await import("drizzle-orm");

				const membership = await db
					.select({ role: member.role })
					.from(member)
					.where(
						and(
							eq(member.userId, user.id),
							eq(member.organizationId, params.departmentId),
						),
					)
					.limit(1);

				if (!membership.length) {
					return new Response(
						JSON.stringify({ error: "Department not found" }),
						{ status: 404, headers: { "Content-Type": "application/json" } },
					);
				}

				const teams = await db
					.select({
						id: team.id,
						name: team.name,
					})
					.from(teamMember)
					.innerJoin(team, eq(teamMember.teamId, team.id))
					.where(
						and(
							eq(teamMember.userId, user.id),
							eq(team.organizationId, params.departmentId),
						),
					);

				return new Response(
					JSON.stringify({
						columns: [{ key: "name", label: "Name" }],
						rows: teams,
						total: teams.length,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
