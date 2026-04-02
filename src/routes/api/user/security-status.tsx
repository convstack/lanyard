import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/lib/auth";

export const Route = createFileRoute("/api/user/security-status")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) {
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
					.where(eq(user.id, session.user.id))
					.limit(1);

				const [passkeyCount] = await db
					.select({ count: count() })
					.from(passkey)
					.where(eq(passkey.userId, session.user.id));

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
