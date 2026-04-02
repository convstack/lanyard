import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/lib/auth";

export const Route = createFileRoute("/api/admin/stats")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session || session.user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const {
					user,
					session: sessionTable,
					oauthApplication,
					serviceCatalogEntry,
				} = await import("~/db/schema");
				const { count } = await import("drizzle-orm");

				const [
					[{ userCount }],
					[{ sessionCount }],
					[{ clientCount }],
					[{ serviceCount }],
				] = await Promise.all([
					db.select({ userCount: count() }).from(user),
					db.select({ sessionCount: count() }).from(sessionTable),
					db.select({ clientCount: count() }).from(oauthApplication),
					db.select({ serviceCount: count() }).from(serviceCatalogEntry),
				]);

				return new Response(
					JSON.stringify({
						value: userCount,
						changeLabel: `${sessionCount} sessions · ${clientCount} clients · ${serviceCount} services`,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
