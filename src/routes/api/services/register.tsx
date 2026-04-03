import { createFileRoute } from "@tanstack/react-router";
import { hash } from "bcryptjs";
import { nanoid } from "nanoid";
import type { UIManifest } from "~/db/schema/service-catalog";
import { checkRateLimit, RATE_LIMITS } from "~/lib/security/rate-limiter";
import { registerServiceSchema } from "~/lib/validators/service-catalog";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/services/register")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				// Rate limit
				const ip =
					request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
					"unknown";
				const rl = checkRateLimit(ip, RATE_LIMITS.general);
				if (!rl.allowed) {
					return new Response(JSON.stringify({ error: "Too many requests" }), {
						status: 429,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Require admin session
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser || authedUser.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Parse and validate body
				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return new Response(JSON.stringify({ error: "Invalid JSON" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}

				const parsed = registerServiceSchema.safeParse(body);
				if (!parsed.success) {
					return new Response(
						JSON.stringify({
							error: "Validation failed",
							details: parsed.error.flatten(),
						}),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}

				const { db } = await import("~/db");
				const {
					serviceCatalogEntry,
					serviceCatalogAuditLog,
					servicePermission,
				} = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				// Check slug uniqueness
				const existing = await db
					.select({ id: serviceCatalogEntry.id })
					.from(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.slug, parsed.data.slug))
					.limit(1);
				if (existing.length > 0) {
					return new Response(
						JSON.stringify({
							error: "A service with this slug already exists",
						}),
						{ status: 409, headers: { "Content-Type": "application/json" } },
					);
				}

				// Generate API key
				const apiKey = `sk_svc_${nanoid(32)}`;
				const apiKeyPrefix = apiKey.slice(0, 12);
				const apiKeyHash = await hash(apiKey, 12);

				const serviceId = nanoid();

				const requiredOrganizationId =
					parsed.data.requiredOrganizationId || null;

				// Insert service
				await db.insert(serviceCatalogEntry).values({
					id: serviceId,
					name: parsed.data.name,
					slug: parsed.data.slug,
					type: parsed.data.type,
					description: parsed.data.description ?? null,
					version: parsed.data.version ?? null,
					baseUrl: parsed.data.baseUrl,
					healthCheckPath: parsed.data.healthCheckPath,
					uiManifest: parsed.data.uiManifest as UIManifest,
					apiKeyHash,
					apiKeyPrefix,
					registeredBy: authedUser.id,
					requiredOrganizationId,
				});

				// Insert declared permissions
				if (parsed.data.uiManifest.permissions.length > 0) {
					await db.insert(servicePermission).values(
						parsed.data.uiManifest.permissions.map((perm) => ({
							id: nanoid(),
							serviceId,
							permission: perm,
						})),
					);
				}

				// Audit log
				await db.insert(serviceCatalogAuditLog).values({
					id: nanoid(),
					serviceId,
					action: "registered",
					details: { name: parsed.data.name, slug: parsed.data.slug },
					performedBy: authedUser.id,
				});

				return new Response(
					JSON.stringify({
						serviceId,
						apiKey,
						message: "Store this API key securely. It will not be shown again.",
					}),
					{
						status: 201,
						headers: { "Content-Type": "application/json" },
					},
				);
			},
		},
	},
});
