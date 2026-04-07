import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/branding")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Get branding configuration
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
				const { brandingConfig } = await import("~/db/schema");
				const { isNull } = await import("drizzle-orm");

				const [found] = await db
					.select()
					.from(brandingConfig)
					.where(isNull(brandingConfig.organizationId))
					.limit(1);

				const record = found ?? {
					appName: "Lanyard",
					logoUrl: null,
					faviconUrl: null,
					primaryColor: null,
					accentColor: null,
					backgroundColor: null,
					foregroundColor: null,
					mutedColor: null,
					destructiveColor: null,
					borderRadius: null,
					customCss: null,
				};

				return new Response(
					JSON.stringify({
						fields: [
							{ key: "appName", label: "App Name", value: record.appName },
							{
								key: "logoUrl",
								label: "Logo URL",
								value: record.logoUrl ?? "",
							},
							{
								key: "faviconUrl",
								label: "Favicon URL",
								value: record.faviconUrl ?? "",
							},
							{
								key: "primaryColor",
								label: "Primary Color",
								value: record.primaryColor ?? "",
							},
							{
								key: "accentColor",
								label: "Accent Color",
								value: record.accentColor ?? "",
							},
							{
								key: "backgroundColor",
								label: "Background Color",
								value: record.backgroundColor ?? "",
							},
							{
								key: "foregroundColor",
								label: "Foreground Color",
								value: record.foregroundColor ?? "",
							},
							{
								key: "mutedColor",
								label: "Muted Color",
								value: record.mutedColor ?? "",
							},
							{
								key: "destructiveColor",
								label: "Destructive Color",
								value: record.destructiveColor ?? "",
							},
							{
								key: "borderRadius",
								label: "Border Radius",
								value: record.borderRadius ?? "",
							},
							{
								key: "customCss",
								label: "Custom CSS",
								value: record.customCss ?? "",
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

			/** @openapi
			 * summary: Update branding configuration
			 * auth: admin
			 * body:
			 *   appName: string - Application name
			 *   logoUrl: string - Logo URL
			 *   faviconUrl: string - Favicon URL
			 *   primaryColor: string - Primary color
			 *   accentColor: string - Accent color
			 *   backgroundColor: string - Background color
			 *   foregroundColor: string - Foreground color
			 *   mutedColor: string - Muted color
			 *   destructiveColor: string - Destructive color
			 *   borderRadius: string - Border radius
			 *   customCss: string - Custom CSS
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
				const { brandingConfig } = await import("~/db/schema");
				const { isNull } = await import("drizzle-orm");

				const [existing] = await db
					.select({ id: brandingConfig.id })
					.from(brandingConfig)
					.where(isNull(brandingConfig.organizationId))
					.limit(1);

				const now = new Date();

				if (existing) {
					await db
						.update(brandingConfig)
						.set({
							appName: body.appName ?? undefined,
							logoUrl: body.logoUrl ?? undefined,
							faviconUrl: body.faviconUrl ?? undefined,
							primaryColor: body.primaryColor ?? undefined,
							accentColor: body.accentColor ?? undefined,
							backgroundColor: body.backgroundColor ?? undefined,
							foregroundColor: body.foregroundColor ?? undefined,
							mutedColor: body.mutedColor ?? undefined,
							destructiveColor: body.destructiveColor ?? undefined,
							borderRadius: body.borderRadius ?? undefined,
							customCss: body.customCss ?? undefined,
							updatedAt: now,
						})
						.where(isNull(brandingConfig.organizationId));
				} else {
					const { nanoid } = await import("nanoid");
					await db.insert(brandingConfig).values({
						id: nanoid(),
						organizationId: null,
						appName: body.appName ?? "Lanyard",
						logoUrl: body.logoUrl ?? null,
						faviconUrl: body.faviconUrl ?? null,
						primaryColor: body.primaryColor ?? null,
						accentColor: body.accentColor ?? null,
						backgroundColor: body.backgroundColor ?? null,
						foregroundColor: body.foregroundColor ?? null,
						mutedColor: body.mutedColor ?? null,
						destructiveColor: body.destructiveColor ?? null,
						borderRadius: body.borderRadius ?? null,
						customCss: body.customCss ?? null,
						createdAt: now,
						updatedAt: now,
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
