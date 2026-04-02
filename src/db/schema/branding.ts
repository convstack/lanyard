import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const brandingConfig = pgTable("branding_config", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id"),
	appName: text("app_name").notNull().default("Lanyard"),
	logoUrl: text("logo_url"),
	faviconUrl: text("favicon_url"),
	primaryColor: text("primary_color"),
	accentColor: text("accent_color"),
	backgroundColor: text("background_color"),
	foregroundColor: text("foreground_color"),
	mutedColor: text("muted_color"),
	destructiveColor: text("destructive_color"),
	borderRadius: text("border_radius"),
	customCss: text("custom_css"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
