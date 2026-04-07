import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/departments/$departmentId/members/$memberId/role",
)({
	server: {
		handlers: {
			/** @openapi
			 * summary: Toggle a department member role between admin and member (admin)
			 * auth: admin
			 * response: 200
			 *   success: boolean
			 * error: 401 Unauthorized
			 * error: 404 Member not found
			 */
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { departmentId: string; memberId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { member } = await import("~/db/schema");
				const { and, eq } = await import("drizzle-orm");

				const [found] = await db
					.select({ role: member.role })
					.from(member)
					.where(
						and(
							eq(member.id, params.memberId),
							eq(member.organizationId, params.departmentId),
						),
					)
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "Member not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				const newRole = found.role === "admin" ? "member" : "admin";

				await db
					.update(member)
					.set({ role: newRole })
					.where(
						and(
							eq(member.id, params.memberId),
							eq(member.organizationId, params.departmentId),
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
