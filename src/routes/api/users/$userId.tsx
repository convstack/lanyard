import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasServiceAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/users/$userId")({
	server: {
		handlers: {
			/**
			 * Public profile lookup — returns only non-sensitive fields (name, image).
			 * Accessible to any authenticated service or admin.
			 */
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { userId: string };
			}) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser || !hasServiceAccess(authedUser.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { user } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [found] = await db
					.select({
						id: user.id,
						name: user.name,
						image: user.image,
					})
					.from(user)
					.where(eq(user.id, params.userId))
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "User not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				return new Response(
					JSON.stringify({
						id: found.id,
						name: found.name ?? "Unknown",
						image: found.image,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
