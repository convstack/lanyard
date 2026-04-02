import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/lib/auth";

export const Route = createFileRoute(
	"/api/user/connected-apps/$consentId/revoke",
)({
	server: {
		handlers: {
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { consentId: string };
			}) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { oauthConsent } = await import("~/db/schema");
				const { and, eq } = await import("drizzle-orm");

				const [consent] = await db
					.select({ id: oauthConsent.id })
					.from(oauthConsent)
					.where(
						and(
							eq(oauthConsent.id, params.consentId),
							eq(oauthConsent.userId, session.user.id),
						),
					)
					.limit(1);

				if (!consent) {
					return new Response(JSON.stringify({ error: "Consent not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				await db
					.delete(oauthConsent)
					.where(eq(oauthConsent.id, params.consentId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
