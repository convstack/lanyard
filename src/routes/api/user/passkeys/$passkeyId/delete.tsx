import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/passkeys/$passkeyId/delete")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Delete a passkey
			 * auth: user
			 * response: 200
			 *   success: boolean
			 * error: 401 Unauthorized
			 * error: 404 Passkey not found
			 */
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { passkeyId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { passkey } = await import("~/db/schema");
				const { eq, and } = await import("drizzle-orm");

				const [target] = await db
					.select({ id: passkey.id })
					.from(passkey)
					.where(
						and(eq(passkey.id, params.passkeyId), eq(passkey.userId, user.id)),
					)
					.limit(1);

				if (!target) {
					return new Response(JSON.stringify({ error: "Passkey not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				await db.delete(passkey).where(eq(passkey.id, params.passkeyId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
