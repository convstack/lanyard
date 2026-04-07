import { createFileRoute } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/departments/$departmentId/teams",
)({
	server: {
		handlers: {
			/** @openapi
			 * summary: List teams in a department (admin)
			 * auth: admin
			 * response: 200
			 *   columns: array
			 *   rows: array
			 *   total: number
			 *   rowActions: array
			 *   rowLink: string
			 * error: 401 Unauthorized
			 */
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { departmentId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || !hasAdminReadAccess(user.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { team, teamMember } = await import("~/db/schema");
				const { eq, count } = await import("drizzle-orm");

				const teams = await db
					.select({
						id: team.id,
						name: team.name,
					})
					.from(team)
					.where(eq(team.organizationId, params.departmentId));

				const rows = await Promise.all(
					teams.map(async (t) => {
						const [{ memberCount }] = await db
							.select({ memberCount: count() })
							.from(teamMember)
							.where(eq(teamMember.teamId, t.id));
						return {
							id: t.id,
							name: t.name,
							memberCount,
						};
					}),
				);

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "name", label: "Name" },
							{ key: "memberCount", label: "Members" },
						],
						rows,
						total: rows.length,
						rowActions: [
							{
								label: "Delete",
								endpoint: `/api/admin/departments/${params.departmentId}/teams/:id/delete`,
								method: "POST",
								variant: "danger",
								confirm: "Delete this team?",
							},
						],
						rowLink: `/departments/${params.departmentId}/teams/:id/members`,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
			/** @openapi
			 * summary: Create a team in a department (admin)
			 * auth: admin
			 * body:
			 *   name: string (required) - Team name
			 * response: 201
			 *   success: boolean
			 * error: 400 Name is required
			 * error: 401 Unauthorized
			 */
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { departmentId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const body = await request.json();
				const { name } = body as { name: string };

				if (!name) {
					return new Response(JSON.stringify({ error: "Name is required" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { team } = await import("~/db/schema");

				await db.insert(team).values({
					id: nanoid(),
					name,
					organizationId: params.departmentId,
				});

				return new Response(JSON.stringify({ success: true }), {
					status: 201,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
