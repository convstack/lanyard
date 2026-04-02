import { createFileRoute } from "@tanstack/react-router";
import { compare } from "bcryptjs";
import { nanoid } from "nanoid";
import { checkRateLimit } from "~/lib/security/rate-limiter";
import { uiManifestSchema } from "~/lib/validators/service-catalog";

export const Route = createFileRoute("/api/services/heartbeat")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const ip =
					request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
					"unknown";
				const rl = checkRateLimit(ip, {
					windowMs: 60_000,
					max: 60,
					keyPrefix: "heartbeat",
				});
				if (!rl.allowed) {
					return new Response(JSON.stringify({ error: "Too many requests" }), {
						status: 429,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Authenticate via ServiceKey header
				const authHeader = request.headers.get("authorization");
				if (!authHeader?.startsWith("ServiceKey ")) {
					return new Response(
						JSON.stringify({ error: "Missing ServiceKey authorization" }),
						{ status: 401, headers: { "Content-Type": "application/json" } },
					);
				}

				const apiKey = authHeader.slice("ServiceKey ".length);
				const apiKeyPrefix = apiKey.slice(0, 12);

				const { db } = await import("~/db");
				const {
					serviceCatalogEntry,
					serviceCatalogAuditLog,
					servicePermission,
				} = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				// Look up service by API key prefix
				const [service] = await db
					.select()
					.from(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.apiKeyPrefix, apiKeyPrefix))
					.limit(1);

				if (!service) {
					return new Response(JSON.stringify({ error: "Invalid API key" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Verify full API key
				const validKey = await compare(apiKey, service.apiKeyHash);
				if (!validKey) {
					return new Response(JSON.stringify({ error: "Invalid API key" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				if (service.disabled) {
					return new Response(
						JSON.stringify({ error: "Service is disabled" }),
						{ status: 403, headers: { "Content-Type": "application/json" } },
					);
				}

				// Parse optional body for manifest updates
				let body: { version?: string; uiManifest?: unknown } = {};
				try {
					const text = await request.text();
					if (text) {
						body = JSON.parse(text);
					}
				} catch {
					// Empty body is fine for a simple heartbeat
				}

				const updates: Record<string, unknown> = {
					lastHealthCheck: new Date(),
					lastHealthStatus: "healthy",
					consecutiveFailures: 0,
					updatedAt: new Date(),
				};

				// Reset status if it was degraded
				if (service.status === "degraded" || service.status === "inactive") {
					updates.status = "active";
					await db.insert(serviceCatalogAuditLog).values({
						id: nanoid(),
						serviceId: service.id,
						action: "health_changed",
						details: { from: service.status, to: "active" },
						performedBy: "system",
					});
				}

				if (body.version) {
					updates.version = body.version;
				}

				// Update manifest if provided
				if (body.uiManifest) {
					const parsed = uiManifestSchema.safeParse(body.uiManifest);
					if (parsed.success) {
						updates.uiManifest = parsed.data;

						// Sync permissions
						await db
							.delete(servicePermission)
							.where(eq(servicePermission.serviceId, service.id));
						if (parsed.data.permissions.length > 0) {
							await db.insert(servicePermission).values(
								parsed.data.permissions.map((perm) => ({
									id: nanoid(),
									serviceId: service.id,
									permission: perm,
								})),
							);
						}
					}
				}

				await db
					.update(serviceCatalogEntry)
					.set(updates)
					.where(eq(serviceCatalogEntry.id, service.id));

				return new Response(JSON.stringify({ status: "ok" }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
