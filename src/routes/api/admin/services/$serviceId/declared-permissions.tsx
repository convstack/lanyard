import { createFileRoute } from "@tanstack/react-router";
import { db } from "~/db";
import { servicePermission } from "~/db/schema";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/services/$serviceId/declared-permissions",
)({
	server: {
		handlers: {
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { serviceId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || !hasAdminReadAccess(user.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { eq } = await import("drizzle-orm");

				const url = new URL(request.url);
				const q = url.searchParams.get("q")?.trim()?.toLowerCase();

				const rows = await db
					.select({
						permission: servicePermission.permission,
						description: servicePermission.description,
					})
					.from(servicePermission)
					.where(eq(servicePermission.serviceId, params.serviceId));

				const filtered = q
					? rows.filter((r) => r.permission.toLowerCase().includes(q))
					: rows;

				return new Response(
					JSON.stringify({
						results: filtered.map((r) => ({
							id: r.permission,
							name: r.permission,
							description: r.description || "",
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
