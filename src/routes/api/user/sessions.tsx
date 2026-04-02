import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	verifyAccessToken,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/sessions")({
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
				const { session: sessionTable } = await import("~/db/schema");
				const { eq, desc } = await import("drizzle-orm");

				// Find which session is associated with the current OAuth2 token
				let currentSessionCreatedAt: Date | null = null;
				const oauthResult = await verifyAccessToken(request);
				if (oauthResult) {
					// The OAuth2 token was issued during a login session.
					// The most recent session for this user is likely the "current" one.
					const [latest] = await db
						.select({ createdAt: sessionTable.createdAt })
						.from(sessionTable)
						.where(eq(sessionTable.userId, user.id))
						.orderBy(desc(sessionTable.createdAt))
						.limit(1);
					currentSessionCreatedAt = latest?.createdAt ?? null;
				}

				const sessions = await db
					.select({
						id: sessionTable.id,
						token: sessionTable.token,
						ipAddress: sessionTable.ipAddress,
						userAgent: sessionTable.userAgent,
						expiresAt: sessionTable.expiresAt,
						createdAt: sessionTable.createdAt,
					})
					.from(sessionTable)
					.where(eq(sessionTable.userId, user.id))
					.orderBy(desc(sessionTable.createdAt));

				const rows = sessions.map((s, idx) => ({
					id: s.id,
					token: s.token,
					device: s.userAgent
						? s.userAgent.length > 60
							? `${s.userAgent.slice(0, 60)}...`
							: s.userAgent
						: "Unknown device",
					ip: s.ipAddress ?? "—",
					expires: s.expiresAt ? s.expiresAt.toISOString().slice(0, 10) : "",
					current:
						currentSessionCreatedAt &&
						idx === 0 &&
						s.createdAt.getTime() === currentSessionCreatedAt.getTime()
							? "Current"
							: "",
				}));

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "device", label: "Device" },
							{ key: "ip", label: "IP Address" },
							{ key: "expires", label: "Expires" },
							{ key: "current", label: "" },
						],
						rows,
						total: rows.length,
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
