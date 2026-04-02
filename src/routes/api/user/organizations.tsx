import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/organizations")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const columns = [
					{ key: "name", label: "Name" },
					{ key: "slug", label: "Slug" },
					{ key: "role", label: "Role" },
				];

				try {
					const { db } = await import("~/db");
					const { member, organization } = await import("~/db/schema");
					const { eq } = await import("drizzle-orm");

					const memberships = await db
						.select({
							name: organization.name,
							slug: organization.slug,
							role: member.role,
						})
						.from(member)
						.innerJoin(organization, eq(member.organizationId, organization.id))
						.where(eq(member.userId, user.id));

					const rows = memberships.map((m) => ({
						name: m.name,
						slug: m.slug,
						role: m.role,
					}));

					return new Response(
						JSON.stringify({ columns, rows, total: rows.length }),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch {
					return new Response(JSON.stringify({ columns, rows: [], total: 0 }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}
			},
		},
	},
});
