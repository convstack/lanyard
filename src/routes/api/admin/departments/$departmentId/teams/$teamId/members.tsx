import { createFileRoute } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/departments/$departmentId/teams/$teamId/members",
)({
	server: {
		handlers: {
			/** @openapi
			 * summary: List team members (admin)
			 * auth: admin
			 * response: 200
			 *   columns: array
			 *   rows: array
			 *   total: number
			 *   rowActions: array
			 * error: 401 Unauthorized
			 */
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { departmentId: string; teamId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || !hasAdminReadAccess(user.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const {
					organization,
					team,
					teamMember,
					user: userTable,
				} = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [dept] = await db
					.select({ id: organization.id, name: organization.name })
					.from(organization)
					.where(eq(organization.id, params.departmentId))
					.limit(1);

				const [teamRow] = await db
					.select({ id: team.id, name: team.name })
					.from(team)
					.where(eq(team.id, params.teamId))
					.limit(1);

				const members = await db
					.select({
						id: teamMember.id,
						name: userTable.name,
						email: userTable.email,
					})
					.from(teamMember)
					.innerJoin(userTable, eq(teamMember.userId, userTable.id))
					.where(eq(teamMember.teamId, params.teamId));

				const rows = members.map((m) => ({
					id: m.id,
					name: m.name,
					email: m.email,
				}));

				const topBar = {
					breadcrumbs: [
						{ label: "Departments", href: "/departments" },
						{
							label: dept?.name ?? "Department",
							href: `/departments/${params.departmentId}`,
						},
						{
							label: teamRow?.name ?? "Team",
							href: `/departments/${params.departmentId}/teams`,
						},
						{ label: "Members" },
					],
				};

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "name", label: "Name" },
							{ key: "email", label: "Email" },
						],
						rows,
						total: rows.length,
						rowActions: [
							{
								label: "Remove",
								endpoint: `/api/admin/departments/${params.departmentId}/teams/${params.teamId}/members/:id/remove`,
								method: "POST",
								variant: "danger",
								confirm: "Remove from team?",
							},
						],
						topBar,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
			/** @openapi
			 * summary: Add a member to a team (admin)
			 * auth: admin
			 * body:
			 *   userId: string (required) - User ID to add
			 * response: 201
			 *   success: boolean
			 * error: 400 userId is required
			 * error: 401 Unauthorized
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

				const body = await request.json();
				const { userId } = body as { userId: string };

				if (!userId) {
					return new Response(JSON.stringify({ error: "userId is required" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { teamMember } = await import("~/db/schema");

				await db.insert(teamMember).values({
					id: nanoid(),
					teamId: params.teamId,
					userId,
				});

				return new Response(JSON.stringify({ success: true }), {
					status: 201,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
