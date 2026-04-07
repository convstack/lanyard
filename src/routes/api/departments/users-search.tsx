import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/departments/users-search")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Search users by name or email for department member lookup
			 * auth: user
			 * query:
			 *   q: string (required) - Search query (min 2 chars)
			 * response: 200
			 *   results: array
			 * error: 401 Unauthorized
			 */
			GET: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Any authenticated user can search (the add-member form enforces dept admin)
				const url = new URL(request.url);
				const q = url.searchParams.get("q") || "";

				if (q.length < 2) {
					return new Response(JSON.stringify({ results: [] }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { user: userTable } = await import("~/db/schema");
				const { or, ilike } = await import("drizzle-orm");

				const users = await db
					.select({
						id: userTable.id,
						name: userTable.name,
						email: userTable.email,
					})
					.from(userTable)
					.where(
						or(
							ilike(userTable.name, `%${q}%`),
							ilike(userTable.email, `%${q}%`),
						),
					)
					.limit(10);

				const results = users.map((u) => ({
					id: u.id,
					name: `${u.name} (${u.email})`,
					email: u.email,
				}));

				return new Response(JSON.stringify({ results }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
