import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const appSettings = pgTable("app_settings", {
	id: text("id").primaryKey(),
	avatarMaxSizeMb: integer("avatar_max_size_mb").notNull().default(2),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
