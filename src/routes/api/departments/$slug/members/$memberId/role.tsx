import { createFileRoute } from "@tanstack/react-router";
import { getDepartmentBySlug } from "~/lib/department-utils";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/departments/$slug/members/$memberId/role",
)({
	server: {
		handlers: {
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { slug: string; memberId: string };
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

				const { db } = await import("~/db");
				const { member } = await import("~/db/schema");
				const { eq, and } = await import("drizzle-orm");

				const [target] = await db
					.select({ id: member.id, role: member.role })
					.from(member)
					.where(
						and(
							eq(member.id, params.memberId),
							eq(member.organizationId, dept.departmentId),
						),
					)
					.limit(1);

				if (!target) {
					return new Response(JSON.stringify({ error: "Member not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				const newRole = target.role === "admin" ? "member" : "admin";
				await db
					.update(member)
					.set({ role: newRole })
					.where(eq(member.id, params.memberId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
