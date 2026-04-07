import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/departments/$departmentId/delete",
)({
	server: {
		handlers: {
			/** @openapi
			 * summary: Delete a department and cascade remove members, teams
			 * auth: admin
			 * response: 200
			 *   success: boolean
			 * error: 401 Unauthorized
			 * error: 404 Department not found
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

				const { db } = await import("~/db");
				const { organization } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [existing] = await db
					.select({ id: organization.id })
					.from(organization)
					.where(eq(organization.id, params.departmentId))
					.limit(1);

				if (!existing) {
					return new Response(
						JSON.stringify({ error: "Department not found" }),
						{ status: 404, headers: { "Content-Type": "application/json" } },
					);
				}

				// Cascade deletes members, teams, invitations
				await db
					.delete(organization)
					.where(eq(organization.id, params.departmentId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
