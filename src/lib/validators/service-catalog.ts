/**
 * Lanyard service-catalog validators.
 *
 * The manifest schemas (UIManifest, PageDefinition, PageSection, etc.) are
 * the SINGLE SOURCE OF TRUTH and live in `@convstack/service-sdk/manifest-schema`.
 * That file is shared with the dashboard (which infers TypeScript types from
 * it) and any service authoring a manifest.
 *
 * This file holds only the lanyard-specific schemas that wrap the manifest
 * (registerService, updateService) — they extend the manifest schema with
 * lanyard-only fields like slug, baseUrl, healthCheckPath.
 *
 * Adding a new field, section type, or layout value to the manifest contract
 * does NOT require touching this file: edit `manifest-schema.ts` in the
 * service-sdk and the change automatically propagates here.
 */

import { uiManifestSchema } from "@convstack/service-sdk/manifest-schema";
import { z } from "zod";

// Re-export the canonical manifest schema so existing imports of
// `uiManifestSchema` from this file continue to work.
export { uiManifestSchema };

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
