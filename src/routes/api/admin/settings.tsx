import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/settings")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { appSettings } = await import("~/db/schema");
				const [settings] = await db.select().from(appSettings).limit(1);

				return new Response(
					JSON.stringify({
						fields: [
							{
								key: "avatarMaxSizeMb",
								label: "Avatar Max Size (MB)",
								value: settings?.avatarMaxSizeMb ?? 2,
							},
							{
								key: "discordAuth",
								label: "Discord OAuth",
								value: Boolean(process.env.DISCORD_CLIENT_ID),
							},
							{
								key: "googleAuth",
								label: "Google OAuth",
								value: Boolean(process.env.GOOGLE_CLIENT_ID),
							},
							{
								key: "githubAuth",
								label: "GitHub OAuth",
								value: Boolean(process.env.GITHUB_CLIENT_ID),
							},
							{
								key: "emailEnabled",
								label: "Email Configured",
								value: Boolean(
									process.env.SMTP_HOST ?? process.env.RESEND_API_KEY,
								),
							},
							{ key: "rateLimit", label: "Rate Limiting", value: true },
							{ key: "twoFactor", label: "Two-Factor Auth", value: true },
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

			PUT: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const body = (await request.json()) as Record<string, string>;
				const { db } = await import("~/db");
				const { appSettings } = await import("~/db/schema");

				const [existing] = await db.select().from(appSettings).limit(1);

				const updates: Record<string, unknown> = {
					updatedAt: new Date(),
				};
				if (body.avatarMaxSizeMb) {
					updates.avatarMaxSizeMb = Number(body.avatarMaxSizeMb) || 2;
				}

				if (existing) {
					const { eq } = await import("drizzle-orm");
					await db
						.update(appSettings)
						.set(updates)
						.where(eq(appSettings.id, existing.id));
				} else {
					const { nanoid } = await import("nanoid");
					await db.insert(appSettings).values({
						id: nanoid(),
						avatarMaxSizeMb: Number(body.avatarMaxSizeMb) || 2,
						createdAt: new Date(),
						updatedAt: new Date(),
					});
				}

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
