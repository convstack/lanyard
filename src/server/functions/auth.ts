import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

export const getSessionFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();
		const session = await auth.api.getSession({
			headers: request.headers,
		});
		return session;
	},
);

export const getEnabledProvidersFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return {
		discord: !!(
			process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
		),
		google: !!(
			process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
		),
		github: !!(
			process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
		),
	};
});

export const getDashboardUrlFn = createServerFn({ method: "GET" }).handler(
	async () => {
		return process.env.DASHBOARD_URL || "http://localhost:4000";
	},
);

export const getBrandingFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { db } = await import("~/db");
		const { brandingConfig } = await import("~/db/schema");
		const { isNull } = await import("drizzle-orm");

		const config = await db
			.select()
			.from(brandingConfig)
			.where(isNull(brandingConfig.organizationId))
			.limit(1);

		return config[0] ?? null;
	},
);
