import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/departments/$departmentId")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Get department details for the current user
			 * auth: user
			 * response: 200
			 *   fields: array
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
				const { organization, member, team } = await import("~/db/schema");
				const { eq, count, and } = await import("drizzle-orm");

				const [membership] = await db
					.select({
						role: member.role,
					})
					.from(member)
					.where(
						and(
							eq(member.userId, user.id),
							eq(member.organizationId, params.departmentId),
						),
					)
					.limit(1);

				if (!membership) {
					return new Response(
						JSON.stringify({ error: "Department not found" }),
						{ status: 404, headers: { "Content-Type": "application/json" } },
					);
				}

				const [found] = await db
					.select()
					.from(organization)
					.where(eq(organization.id, params.departmentId))
					.limit(1);

				if (!found) {
					return new Response(
						JSON.stringify({ error: "Department not found" }),
						{ status: 404, headers: { "Content-Type": "application/json" } },
					);
				}

				const [{ teamCount }] = await db
					.select({ teamCount: count() })
					.from(team)
					.where(eq(team.organizationId, params.departmentId));

				return new Response(
					JSON.stringify({
						fields: [
							{ key: "name", label: "Name", value: found.name },
							{ key: "slug", label: "Slug", value: found.slug },
							{ key: "role", label: "Your Role", value: membership.role },
							{
								key: "teamCount",
								label: "Teams",
								value: String(teamCount),
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
