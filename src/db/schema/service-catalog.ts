import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization";

export interface UIManifest {
	name: string;
	icon: string;
	version: string;
	navigation: NavigationItem[];
	widgets: WidgetDefinition[];
	pages: PageDefinition[];
	permissions: string[];
}

export interface NavigationItem {
	label: string;
	path: string;
	icon: string;
	href?: string;
	badge?: { endpoint: string };
	children?: NavigationItem[];
	requiredPermission?: string;
}

export interface WidgetDefinition {
	id: string;
	type: "stat" | "chart" | "table" | "list" | "progress";
	label: string;
	description?: string;
	endpoint: string;
	refreshInterval?: number;
	size: "sm" | "md" | "lg" | "full";
	requiredPermission?: string;
}

export interface PageDefinition {
	path: string;
	title: string;
	layout: "default" | "full-width" | "split";
	sections: PageSection[];
	requiredPermission?: string;
}

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

export interface PageSection {
	type:
		| "data-table"
		| "form"
		| "detail"
		| "widget-grid"
		| "action-bar"
		| "custom";
	endpoint: string;
	config: Record<string, JsonValue>;
}

export const serviceCatalogEntry = pgTable("service_catalog_entry", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	type: text("type").notNull(),
	description: text("description"),
	version: text("version"),
	baseUrl: text("base_url").notNull(),
	healthCheckPath: text("health_check_path").notNull().default("/health"),
	uiManifest: jsonb("ui_manifest").$type<UIManifest>(),
	apiKeyHash: text("api_key_hash").notNull(),
	apiKeyPrefix: text("api_key_prefix").notNull(),
	status: text("status").notNull().default("active"),
	lastHealthCheck: timestamp("last_health_check"),
	lastHealthStatus: text("last_health_status"),
	consecutiveFailures: integer("consecutive_failures").notNull().default(0),
	registeredBy: text("registered_by").references(() => user.id, {
		onDelete: "set null",
	}),
	disabled: boolean("disabled").notNull().default(false),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const serviceCatalogAuditLog = pgTable("service_catalog_audit_log", {
	id: text("id").primaryKey(),
	serviceId: text("service_id")
		.notNull()
		.references(() => serviceCatalogEntry.id, { onDelete: "cascade" }),
	action: text("action").notNull(),
	details: jsonb("details").$type<Record<string, JsonValue>>(),
	performedBy: text("performed_by"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const servicePermission = pgTable("service_permission", {
	id: text("id").primaryKey(),
	serviceId: text("service_id")
		.notNull()
		.references(() => serviceCatalogEntry.id, { onDelete: "cascade" }),
	permission: text("permission").notNull(),
	description: text("description"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const serviceRolePermission = pgTable("service_role_permission", {
	id: text("id").primaryKey(),
	serviceId: text("service_id")
		.notNull()
		.references(() => serviceCatalogEntry.id, { onDelete: "cascade" }),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	role: text("role").notNull(),
	permission: text("permission").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
