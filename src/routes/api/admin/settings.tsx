import { createFileRoute } from "@tanstack/react-router";
import { clearSettingsCache } from "~/lib/get-settings";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/settings")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Get application settings
			 * auth: admin
			 * response: 200
			 *   fields: array
			 * error: 401 Unauthorized
			 */
			GET: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user || !hasAdminReadAccess(user.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { appSettings } = await import("~/db/schema");
				let s = null;
				try {
					[s] = await db.select().from(appSettings).limit(1);
				} catch {
					// Table may not exist yet
				}

				return new Response(
					JSON.stringify({
						fields: [
							{
								key: "avatarMaxSizeMb",
								label: "Avatar Max Size (MB)",
								value: s?.avatarMaxSizeMb ?? 2,
							},
							{
								key: "discordClientId",
								label: "Discord Client ID",
								value: s?.discordClientId ?? "",
							},
							{
								key: "discordClientSecret",
								label: "Discord Client Secret",
								value: s?.discordClientSecret ?? "",
							},
							{
								key: "googleClientId",
								label: "Google Client ID",
								value: s?.googleClientId ?? "",
							},
							{
								key: "googleClientSecret",
								label: "Google Client Secret",
								value: s?.googleClientSecret ?? "",
							},
							{
								key: "githubClientId",
								label: "GitHub Client ID",
								value: s?.githubClientId ?? "",
							},
							{
								key: "githubClientSecret",
								label: "GitHub Client Secret",
								value: s?.githubClientSecret ?? "",
							},
							{
								key: "emailEnabled",
								label: "Email Configured",
								value: Boolean(
									process.env.SMTP_HOST ?? process.env.RESEND_API_KEY,
								),
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

			/** @openapi
			 * summary: Update application settings
			 * auth: admin
			 * body:
			 *   avatarMaxSizeMb: string - Max avatar file size in MB
			 *   discordClientId: string - Discord OAuth client ID
			 *   discordClientSecret: string - Discord OAuth client secret
			 *   googleClientId: string - Google OAuth client ID
			 *   googleClientSecret: string - Google OAuth client secret
			 *   githubClientId: string - GitHub OAuth client ID
			 *   githubClientSecret: string - GitHub OAuth client secret
			 * response: 200
			 *   success: boolean
			 * error: 401 Unauthorized
			 */
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

				let existing = null;
				try {
					[existing] = await db.select().from(appSettings).limit(1);
				} catch {
					// Table may not exist yet
				}

				const updates: Record<string, unknown> = {
					updatedAt: new Date(),
				};
				if (body.avatarMaxSizeMb)
					updates.avatarMaxSizeMb = Number(body.avatarMaxSizeMb) || 2;
				if (body.discordClientId !== undefined)
					updates.discordClientId = body.discordClientId || null;
				if (body.discordClientSecret !== undefined)
					updates.discordClientSecret = body.discordClientSecret || null;
				if (body.googleClientId !== undefined)
					updates.googleClientId = body.googleClientId || null;
				if (body.googleClientSecret !== undefined)
					updates.googleClientSecret = body.googleClientSecret || null;
				if (body.githubClientId !== undefined)
					updates.githubClientId = body.githubClientId || null;
				if (body.githubClientSecret !== undefined)
					updates.githubClientSecret = body.githubClientSecret || null;

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
						discordClientId: body.discordClientId || null,
						discordClientSecret: body.discordClientSecret || null,
						googleClientId: body.googleClientId || null,
						googleClientSecret: body.googleClientSecret || null,
						githubClientId: body.githubClientId || null,
						githubClientSecret: body.githubClientSecret || null,
						createdAt: new Date(),
						updatedAt: new Date(),
					});
				}

				clearSettingsCache();

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
