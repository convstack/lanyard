import { z } from "zod";
import type { JsonValue, NavigationItem } from "~/db/schema/service-catalog";

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(z.string(), jsonValueSchema),
	]),
);

const navigationItemSchema: z.ZodType<NavigationItem> = z.lazy(() =>
	z.object({
		label: z.string().min(1).max(50),
		path: z
			.string()
			.min(1)
			.max(200)
			.regex(
				/^\/[a-z0-9\-/]*$/,
				"Path must start with / and contain only lowercase alphanumeric characters, hyphens, and slashes",
			),
		icon: z.string().min(1).max(50),
		badge: z.object({ endpoint: z.string().min(1).max(500) }).optional(),
		children: z.array(navigationItemSchema).max(10).optional(),
		requiredPermission: z.string().max(100).optional(),
	}),
);

const widgetDefinitionSchema = z.object({
	id: z.string().min(1).max(100),
	type: z.enum(["stat", "chart", "table", "list", "progress"]),
	label: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	endpoint: z.string().min(1).max(500),
	refreshInterval: z.number().int().min(0).max(3600).optional(),
	size: z.enum(["sm", "md", "lg", "full"]),
	requiredPermission: z.string().max(100).optional(),
});

const pageSectionSchema = z.object({
	type: z.enum([
		"data-table",
		"form",
		"detail",
		"widget-grid",
		"action-bar",
		"two-factor",
		"passkey-manager",
		"markdown",
		"markdown-editor",
		"custom",
	]),
	endpoint: z.string().max(500),
	config: z.record(z.string(), jsonValueSchema),
});

const pageDefinitionSchema = z.object({
	path: z.string().min(1).max(200),
	title: z.string().min(1).max(100),
	layout: z.enum(["default", "full-width", "split"]),
	sections: z.array(pageSectionSchema).max(20),
	requiredPermission: z.string().max(100).optional(),
});

export const uiManifestSchema = z.object({
	name: z.string().min(1).max(100),
	icon: z.string().min(1).max(50),
	version: z.string().max(20).default("1"),
	navigation: z.array(navigationItemSchema).max(30),
	widgets: z.array(widgetDefinitionSchema).max(50),
	pages: z.array(pageDefinitionSchema).max(50),
	permissions: z.array(z.string().max(100)).max(100),
});

export const registerServiceSchema = z.object({
	name: z.string().min(1, "Service name is required").max(100),
	slug: z
		.string()
		.min(1)
		.max(50)
		.regex(
			/^[a-z0-9-]+$/,
			"Slug must contain only lowercase alphanumeric characters and hyphens",
		),
	type: z.string().min(1).max(50),
	description: z.string().max(500).optional(),
	version: z.string().max(20).optional(),
	baseUrl: z.string().url("Base URL must be a valid URL"),
	healthCheckPath: z.string().max(200).default("/health"),
	uiManifest: uiManifestSchema.optional(),
	requiredOrganizationId: z.string().max(100).optional(),
});

export const updateServiceSchema = registerServiceSchema
	.partial()
	.omit({ slug: true });

export type RegisterServiceInput = z.infer<typeof registerServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
