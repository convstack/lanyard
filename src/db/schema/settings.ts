import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const appSettings = pgTable("app_settings", {
	id: text("id").primaryKey(),
	avatarMaxSizeMb: integer("avatar_max_size_mb").notNull().default(2),
	// OAuth providers — DB values override env vars
	discordClientId: text("discord_client_id"),
	discordClientSecret: text("discord_client_secret"),
	googleClientId: text("google_client_id"),
	googleClientSecret: text("google_client_secret"),
	githubClientId: text("github_client_id"),
	githubClientSecret: text("github_client_secret"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
