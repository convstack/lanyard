import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasServiceAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/services/departments/$departmentId")(
	{
		server: {
			handlers: {
				GET: async ({
					request,
					params,
				}: {
					request: Request;
					params: { departmentId: string };
				}) => {
					const user = await getAuthenticatedUser(request);
					if (!user || !hasServiceAccess(user.role)) {
						return new Response(JSON.stringify({ error: "Unauthorized" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					const { db } = await import("~/db");
					const {
						organization,
						team,
						member,
						user: userTable,
					} = await import("~/db/schema");
					const { eq } = await import("drizzle-orm");

					const [dept] = await db
						.select({ id: organization.id, name: organization.name })
						.from(organization)
						.where(eq(organization.id, params.departmentId))
						.limit(1);

					if (!dept) {
						return new Response(
							JSON.stringify({ error: "Department not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const teams = await db
						.select({ id: team.id, name: team.name })
						.from(team)
						.where(eq(team.organizationId, params.departmentId));

					const members = await db
						.select({
							id: member.id,
							userId: member.userId,
							name: userTable.name,
							role: member.role,
						})
						.from(member)
						.innerJoin(userTable, eq(member.userId, userTable.id))
						.where(eq(member.organizationId, params.departmentId));

					return new Response(
						JSON.stringify({
							id: dept.id,
							name: dept.name,
							teams: teams.map((t) => ({ id: t.id, name: t.name })),
							members: members.map((m) => ({
								id: m.id,
								userId: m.userId,
								name: m.name ?? "Unknown",
								role: m.role,
							})),
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				},
			},
		},
	},
);
