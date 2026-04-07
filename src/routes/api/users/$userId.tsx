import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasServiceAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/users/$userId")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Get a user public profile by ID
			 * auth: user
			 * response: 200
			 *   id: string
			 *   name: string
			 *   image: string
			 *   email: string (service-authenticated requests only)
			 * error: 401 Unauthorized
			 * error: 404 User not found
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
						email: user.email,
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

				// Include email only for service-authenticated requests
				const isService =
					authedUser.id.startsWith("service:") ||
					authedUser.role === "service" ||
					authedUser.role === "service-admin";

				return new Response(
					JSON.stringify({
						id: found.id,
						name: found.name ?? "Unknown",
						image: found.image,
						...(isService ? { email: found.email } : {}),
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
