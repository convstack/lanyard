import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/users/search")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Search users by name or email (admin)
			 * auth: admin
			 * query:
			 *   q: string (required) - Search query (min 2 chars)
			 * response: 200
			 *   results: array
			 * error: 401 Unauthorized
			 */
			GET: async ({ request }: { request: Request }) => {
				const admin = await getAuthenticatedUser(request);
				if (!admin || !hasAdminReadAccess(admin.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const url = new URL(request.url);
				const q = url.searchParams.get("q") || "";

				if (q.length < 2) {
					return new Response(JSON.stringify({ results: [] }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { user } = await import("~/db/schema");
				const { or, ilike } = await import("drizzle-orm");

				const users = await db
					.select({
						id: user.id,
						name: user.name,
						email: user.email,
					})
					.from(user)
					.where(or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`)))
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
