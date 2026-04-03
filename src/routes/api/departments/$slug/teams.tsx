import { createFileRoute } from "@tanstack/react-router";
import { getDepartmentBySlug } from "~/lib/department-utils";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/departments/$slug/teams")({
	server: {
		handlers: {
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { slug: string };
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
				const { team } = await import("~/db/schema");
				const { eq, sql } = await import("drizzle-orm");

				const teams = await db
					.select({
						id: team.id,
						name: team.name,
						memberCount: sql<number>`(
							SELECT count(*)::int FROM "team_member"
							WHERE "team_member"."team_id" = "team"."id"
						)`,
					})
					.from(team)
					.where(eq(team.organizationId, dept.departmentId));

				const isAdmin = dept.role === "admin";

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "name", label: "Team" },
							{ key: "memberCount", label: "Members" },
						],
						rows: teams.map((t) => ({
							...t,
							memberCount: String(t.memberCount),
						})),
						total: teams.length,
						...(isAdmin
							? {
									rowActions: [
										{
											label: "Delete",
											endpoint: `/api/departments/${params.slug}/teams/:id/delete`,
											method: "POST",
											variant: "danger",
											confirm: "Delete this team?",
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
				params: { slug: string };
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
				const { team } = await import("~/db/schema");
				const { nanoid } = await import("nanoid");

				await db.insert(team).values({
					id: nanoid(),
					name: body.name,
					description: body.description || null,
					organizationId: dept.departmentId,
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
