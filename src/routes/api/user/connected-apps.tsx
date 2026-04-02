import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/lib/auth";

export const Route = createFileRoute("/api/user/connected-apps")({
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
				const { oauthConsent, oauthApplication } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const consents = await db
					.select({
						id: oauthConsent.id,
						scopes: oauthConsent.scopes,
						createdAt: oauthConsent.createdAt,
						appName: oauthApplication.name,
					})
					.from(oauthConsent)
					.leftJoin(
						oauthApplication,
						eq(oauthConsent.clientId, oauthApplication.clientId),
					)
					.where(eq(oauthConsent.userId, session.user.id));

				const rows = consents.map((c) => ({
					id: c.id,
					appName: c.appName ?? "Unknown App",
					scopes: c.scopes,
					connectedAt: c.createdAt
						? c.createdAt.toISOString().slice(0, 10)
						: "",
				}));

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "appName", label: "Application" },
							{ key: "scopes", label: "Scopes" },
							{ key: "connectedAt", label: "Connected" },
						],
						rows,
						total: rows.length,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
