import { createFileRoute } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import { auth } from "~/lib/auth";
import { updateServiceSchema } from "~/lib/validators/service-catalog";

export const Route = createFileRoute("/api/services/$serviceId")({
	server: {
		handlers: {
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { serviceId: string };
			}) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session || session.user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { serviceCatalogEntry, serviceCatalogAuditLog } = await import(
					"~/db/schema"
				);
				const { eq, desc } = await import("drizzle-orm");

				const [service] = await db
					.select()
					.from(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.id, params.serviceId))
					.limit(1);

				if (!service) {
					return new Response(JSON.stringify({ error: "Service not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				const auditLog = await db
					.select()
					.from(serviceCatalogAuditLog)
					.where(eq(serviceCatalogAuditLog.serviceId, params.serviceId))
					.orderBy(desc(serviceCatalogAuditLog.createdAt))
					.limit(50);

				return new Response(
					JSON.stringify({
						...service,
						apiKeyHash: undefined,
						auditLog,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

			PUT: async ({
				request,
				params,
			}: {
				request: Request;
				params: { serviceId: string };
			}) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session || session.user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return new Response(JSON.stringify({ error: "Invalid JSON" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}

				const parsed = updateServiceSchema.safeParse(body);
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

				const [existing] = await db
					.select({ id: serviceCatalogEntry.id })
					.from(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.id, params.serviceId))
					.limit(1);

				if (!existing) {
					return new Response(JSON.stringify({ error: "Service not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Build update payload (only provided fields)
				const updates: Record<string, unknown> = { updatedAt: new Date() };
				if (parsed.data.name !== undefined) updates.name = parsed.data.name;
				if (parsed.data.type !== undefined) updates.type = parsed.data.type;
				if (parsed.data.description !== undefined)
					updates.description = parsed.data.description;
				if (parsed.data.version !== undefined)
					updates.version = parsed.data.version;
				if (parsed.data.baseUrl !== undefined)
					updates.baseUrl = parsed.data.baseUrl;
				if (parsed.data.healthCheckPath !== undefined)
					updates.healthCheckPath = parsed.data.healthCheckPath;
				if (parsed.data.uiManifest !== undefined) {
					updates.uiManifest = parsed.data.uiManifest;

					// Sync declared permissions
					await db
						.delete(servicePermission)
						.where(eq(servicePermission.serviceId, params.serviceId));
					if (parsed.data.uiManifest.permissions.length > 0) {
						await db.insert(servicePermission).values(
							parsed.data.uiManifest.permissions.map((perm) => ({
								id: nanoid(),
								serviceId: params.serviceId,
								permission: perm,
							})),
						);
					}
				}

				await db
					.update(serviceCatalogEntry)
					.set(updates)
					.where(eq(serviceCatalogEntry.id, params.serviceId));

				await db.insert(serviceCatalogAuditLog).values({
					id: nanoid(),
					serviceId: params.serviceId,
					action: "updated",
					details: {
						fields: Object.keys(updates).filter((k) => k !== "updatedAt"),
					},
					performedBy: session.user.id,
				});

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},

			DELETE: async ({
				request,
				params,
			}: {
				request: Request;
				params: { serviceId: string };
			}) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session || session.user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { serviceCatalogEntry } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [existing] = await db
					.select({
						id: serviceCatalogEntry.id,
						name: serviceCatalogEntry.name,
					})
					.from(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.id, params.serviceId))
					.limit(1);

				if (!existing) {
					return new Response(JSON.stringify({ error: "Service not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Cascade deletes audit log, permissions, role permissions
				await db
					.delete(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.id, params.serviceId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
