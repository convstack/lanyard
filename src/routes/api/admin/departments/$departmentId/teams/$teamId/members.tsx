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
				const { teamMember, user: userTable } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

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
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
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
