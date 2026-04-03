import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/stats")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser || !hasAdminReadAccess(authedUser.role)) {
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
