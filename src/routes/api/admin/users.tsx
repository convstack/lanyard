import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/users")({
	server: {
		handlers: {
			/** @openapi
			 * summary: List all users
			 * auth: admin
			 * response: 200
			 *   columns: array
			 *   rows: array
			 *   total: number
			 * error: 401 Unauthorized
			 */
			GET: async ({ request }: { request: Request }) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser || !hasAdminReadAccess(authedUser.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { user } = await import("~/db/schema");
				const { desc, count } = await import("drizzle-orm");

				const [users, [{ total }]] = await Promise.all([
					db
						.select({
							id: user.id,
							name: user.name,
							email: user.email,
							role: user.role,
							banned: user.banned,
							emailVerified: user.emailVerified,
							createdAt: user.createdAt,
						})
						.from(user)
						.orderBy(desc(user.createdAt))
						.limit(200),
					db.select({ total: count() }).from(user),
				]);

				const rows = users.map((u) => ({
					id: u.id,
					name: u.name,
					email: u.email,
					role: u.role ?? "user",
					status: u.banned
						? "Banned"
						: u.emailVerified
							? "Active"
							: "Unverified",
					joined: u.createdAt ? u.createdAt.toISOString().slice(0, 10) : "",
				}));

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "name", label: "Name" },
							{ key: "email", label: "Email" },
							{ key: "role", label: "Role" },
							{ key: "status", label: "Status" },
							{ key: "joined", label: "Joined" },
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
