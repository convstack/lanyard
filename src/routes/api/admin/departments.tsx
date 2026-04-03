import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/departments")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
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

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "name", label: "Name" },
							{ key: "slug", label: "Slug" },
							{ key: "memberCount", label: "Members" },
						],
						rows,
						total,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
