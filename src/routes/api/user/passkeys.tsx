import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/passkeys")({
	server: {
		handlers: {
			/** @openapi
			 * summary: List current user passkeys
			 * auth: user
			 * response: 200
			 *   data: array
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

				const { db } = await import("~/db");
				const { passkey } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const passkeys = await db
					.select({
						id: passkey.id,
						name: passkey.name,
						credentialID: passkey.credentialID,
						createdAt: passkey.createdAt,
					})
					.from(passkey)
					.where(eq(passkey.userId, user.id));

				return new Response(JSON.stringify({ data: passkeys }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
