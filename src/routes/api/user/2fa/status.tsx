import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/2fa/status")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { user: userTable } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [found] = await db
					.select({ twoFactorEnabled: userTable.twoFactorEnabled })
					.from(userTable)
					.where(eq(userTable.id, user.id))
					.limit(1);

				return new Response(
					JSON.stringify({ enabled: found?.twoFactorEnabled ?? false }),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
