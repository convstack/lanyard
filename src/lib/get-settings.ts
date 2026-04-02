/**
 * Get app settings from DB, falling back to env vars.
 * Cached in memory — restart to pick up DB changes.
 */

interface AppSettings {
	avatarMaxSizeMb: number;
	discordClientId: string;
	discordClientSecret: string;
	googleClientId: string;
	googleClientSecret: string;
	githubClientId: string;
	githubClientSecret: string;
}

let cached: AppSettings | null = null;

export async function getSettings(): Promise<AppSettings> {
	if (cached) return cached;

	const { db } = await import("~/db");
	const { appSettings } = await import("~/db/schema");
	const [row] = await db.select().from(appSettings).limit(1);

	cached = {
		avatarMaxSizeMb: row?.avatarMaxSizeMb ?? 2,
		discordClientId:
			row?.discordClientId || process.env.DISCORD_CLIENT_ID || "",
		discordClientSecret:
			row?.discordClientSecret || process.env.DISCORD_CLIENT_SECRET || "",
		googleClientId: row?.googleClientId || process.env.GOOGLE_CLIENT_ID || "",
		googleClientSecret:
			row?.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || "",
		githubClientId: row?.githubClientId || process.env.GITHUB_CLIENT_ID || "",
		githubClientSecret:
			row?.githubClientSecret || process.env.GITHUB_CLIENT_SECRET || "",
	};

	return cached;
}

/**
 * Clear the cached settings (call after updating settings).
 */
export function clearSettingsCache() {
	cached = null;
}
