import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/departments/$departmentId/teams/$teamId/members/$teamMemberId/remove",
)({
	server: {
		handlers: {
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: {
					departmentId: string;
					teamId: string;
					teamMemberId: string;
				};
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { teamMember } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [existing] = await db
					.select({ id: teamMember.id })
					.from(teamMember)
					.where(eq(teamMember.id, params.teamMemberId))
					.limit(1);

				if (!existing) {
					return new Response(
						JSON.stringify({ error: "Team member not found" }),
						{
							status: 404,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				await db
					.delete(teamMember)
					.where(eq(teamMember.id, params.teamMemberId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
