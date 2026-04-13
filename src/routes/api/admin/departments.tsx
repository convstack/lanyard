import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/departments")({
	server: {
		handlers: {
			/** @openapi
			 * summary: List all departments with member counts
			 * auth: admin
			 * response: 200
			 *   columns: array
			 *   rows: array
			 *   total: number
			 * error: 401 Unauthorized
			 */
			GET: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user || !hasAdminReadAccess(user.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { organization, member } = await import("~/db/schema");
				const { desc, count, eq } = await import("drizzle-orm");

				const [departments, [{ total }]] = await Promise.all([
					db
						.select({
							id: organization.id,
							name: organization.name,
							slug: organization.slug,
							memberCount: count(member.id),
						})
						.from(organization)
						.leftJoin(member, eq(member.organizationId, organization.id))
						.groupBy(organization.id)
						.orderBy(desc(organization.createdAt))
						.limit(200),
					db.select({ total: count() }).from(organization),
				]);

				const rows = departments.map((d) => ({
					id: d.id,
					name: d.name,
					slug: d.slug,
					memberCount: String(d.memberCount),
				}));

				const topBar = {
					breadcrumbs: [{ label: "Departments" }],
				};

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "name", label: "Name" },
							{ key: "slug", label: "Slug" },
							{ key: "memberCount", label: "Members" },
						],
						rows,
						total,
						topBar,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
