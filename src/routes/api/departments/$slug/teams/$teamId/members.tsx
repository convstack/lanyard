import { createFileRoute } from "@tanstack/react-router";
import { getDepartmentBySlug } from "~/lib/department-utils";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/departments/$slug/teams/$teamId/members",
)({
	server: {
		handlers: {
			GET: async ({
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
				if (!dept) {
					return new Response(JSON.stringify({ error: "Not a member" }), {
						status: 403,
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

				const isAdmin = dept.role === "admin";

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "name", label: "Name" },
							{ key: "email", label: "Email" },
						],
						rows: members,
						total: members.length,
						...(isAdmin
							? {
									rowActions: [
										{
											label: "Remove",
											endpoint: `/api/departments/${params.slug}/teams/${params.teamId}/members/:id/remove`,
											method: "POST",
											variant: "danger",
											confirm: "Remove from team?",
										},
									],
								}
							: {}),
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

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

				const body = await request.json();
				const { db } = await import("~/db");
				const { teamMember } = await import("~/db/schema");
				const { nanoid } = await import("nanoid");

				await db.insert(teamMember).values({
					id: nanoid(),
					teamId: params.teamId,
					userId: body.userId,
					createdAt: new Date(),
				});

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
