import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/security-status")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Get current user security status (2FA, passkeys)
			 * auth: user
			 * response: 200
			 *   fields: array
			 * error: 401 Unauthorized
			 */
			GET: async ({ request }: { request: Request }) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { user, passkey } = await import("~/db/schema");
				const { eq, count } = await import("drizzle-orm");

				const [userData] = await db
					.select({ twoFactorEnabled: user.twoFactorEnabled })
					.from(user)
					.where(eq(user.id, authedUser.id))
					.limit(1);

				const [passkeyCount] = await db
					.select({ count: count() })
					.from(passkey)
					.where(eq(passkey.userId, authedUser.id));

				return new Response(
					JSON.stringify({
						fields: [
							{
								key: "twoFactor",
								label: "Two-Factor Authentication",
								value: userData?.twoFactorEnabled ? "Enabled" : "Disabled",
							},
							{
								key: "passkeys",
								label: "Passkeys Registered",
								value: passkeyCount?.count ?? 0,
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
