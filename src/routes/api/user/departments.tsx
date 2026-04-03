import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/departments")({
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

				const { db } = await import("~/db");
				const { member, organization } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const memberships = await db
					.select({
						id: organization.id,
						name: organization.name,
						slug: organization.slug,
						role: member.role,
					})
					.from(member)
					.innerJoin(organization, eq(member.organizationId, organization.id))
					.where(eq(member.userId, user.id));

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "name", label: "Name" },
							{ key: "slug", label: "Slug" },
							{ key: "role", label: "Your Role" },
						],
						rows: memberships,
						total: memberships.length,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
