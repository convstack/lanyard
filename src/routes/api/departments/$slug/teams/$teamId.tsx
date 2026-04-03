import { createFileRoute } from "@tanstack/react-router";
import { getDepartmentBySlug } from "~/lib/department-utils";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/departments/$slug/teams/$teamId")({
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
				const { team, teamMember } = await import("~/db/schema");
				const { eq, and, count } = await import("drizzle-orm");

				const [found] = await db
					.select({
						id: team.id,
						name: team.name,
						description: team.description,
					})
					.from(team)
					.where(
						and(
							eq(team.id, params.teamId),
							eq(team.organizationId, dept.departmentId),
						),
					)
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "Team not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				const [{ memberCount }] = await db
					.select({ memberCount: count() })
					.from(teamMember)
					.where(eq(teamMember.teamId, params.teamId));

				return new Response(
					JSON.stringify({
						fields: [
							{ key: "name", label: "Team Name", value: found.name },
							{
								key: "description",
								label: "Description",
								value: found.description ?? "",
							},
							{
								key: "members",
								label: "Members",
								value: String(memberCount),
							},
							{ key: "department", label: "Department", value: dept.name },
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

			PUT: async ({
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
				const { team } = await import("~/db/schema");
				const { eq, and } = await import("drizzle-orm");

				const updates: Record<string, unknown> = {
					updatedAt: new Date(),
				};
				if (typeof body.name === "string" && body.name)
					updates.name = body.name;
				if (typeof body.description === "string")
					updates.description = body.description || null;

				await db
					.update(team)
					.set(updates)
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
