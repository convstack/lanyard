import { createFileRoute } from "@tanstack/react-router";
import { db } from "~/db";
import { organization } from "~/db/schema";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/departments/search")({
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

				const url = new URL(request.url);
				const q = url.searchParams.get("q")?.trim();

				if (!q) {
					return new Response(JSON.stringify({ results: [] }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { ilike } = await import("drizzle-orm");

				const rows = await db
					.select({
						id: organization.id,
						name: organization.name,
						slug: organization.slug,
					})
					.from(organization)
					.where(ilike(organization.name, `%${q}%`))
					.limit(10);

				return new Response(
					JSON.stringify({
						results: rows.map((r) => ({
							id: r.id,
							name: r.name,
							slug: r.slug,
						})),
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			},
		},
	},
});
