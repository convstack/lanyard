import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

export const getServiceCatalogStatsFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session || session.user.role !== "admin") {
		throw new Error("Unauthorized");
	}

	const { db } = await import("~/db");
	const { serviceCatalogEntry } = await import("~/db/schema");
	const { count, eq } = await import("drizzle-orm");

	const [total] = await db.select({ count: count() }).from(serviceCatalogEntry);

	const [active] = await db
		.select({ count: count() })
		.from(serviceCatalogEntry)
		.where(eq(serviceCatalogEntry.status, "active"));

	const [degraded] = await db
		.select({ count: count() })
		.from(serviceCatalogEntry)
		.where(eq(serviceCatalogEntry.status, "degraded"));

	const [disabled] = await db
		.select({ count: count() })
		.from(serviceCatalogEntry)
		.where(eq(serviceCatalogEntry.disabled, true));

	return {
		total: total?.count ?? 0,
		active: active?.count ?? 0,
		degraded: degraded?.count ?? 0,
		disabled: disabled?.count ?? 0,
	};
});

export const listServicesFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session || session.user.role !== "admin") {
			throw new Error("Unauthorized");
		}

		const { db } = await import("~/db");
		const { serviceCatalogEntry } = await import("~/db/schema");
		const { desc } = await import("drizzle-orm");

		const services = await db
			.select({
				id: serviceCatalogEntry.id,
				name: serviceCatalogEntry.name,
				slug: serviceCatalogEntry.slug,
				type: serviceCatalogEntry.type,
				description: serviceCatalogEntry.description,
				version: serviceCatalogEntry.version,
				baseUrl: serviceCatalogEntry.baseUrl,
				status: serviceCatalogEntry.status,
				lastHealthCheck: serviceCatalogEntry.lastHealthCheck,
				lastHealthStatus: serviceCatalogEntry.lastHealthStatus,
				consecutiveFailures: serviceCatalogEntry.consecutiveFailures,
				disabled: serviceCatalogEntry.disabled,
				createdAt: serviceCatalogEntry.createdAt,
			})
			.from(serviceCatalogEntry)
			.orderBy(desc(serviceCatalogEntry.createdAt));

		return services;
	},
);

export const getServiceFn = createServerFn({ method: "GET" })
	.inputValidator((input: { serviceId: string }) => input)
	.handler(async ({ data }) => {
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session || session.user.role !== "admin") {
			throw new Error("Unauthorized");
		}

		const { serviceId } = data;

		const { db } = await import("~/db");
		const { serviceCatalogEntry, serviceCatalogAuditLog } = await import(
			"~/db/schema"
		);
		const { eq, desc } = await import("drizzle-orm");

		const [service] = await db
			.select({
				id: serviceCatalogEntry.id,
				name: serviceCatalogEntry.name,
				slug: serviceCatalogEntry.slug,
				type: serviceCatalogEntry.type,
				description: serviceCatalogEntry.description,
				version: serviceCatalogEntry.version,
				baseUrl: serviceCatalogEntry.baseUrl,
				healthCheckPath: serviceCatalogEntry.healthCheckPath,
				uiManifest: serviceCatalogEntry.uiManifest,
				apiKeyPrefix: serviceCatalogEntry.apiKeyPrefix,
				status: serviceCatalogEntry.status,
				lastHealthCheck: serviceCatalogEntry.lastHealthCheck,
				lastHealthStatus: serviceCatalogEntry.lastHealthStatus,
				consecutiveFailures: serviceCatalogEntry.consecutiveFailures,
				disabled: serviceCatalogEntry.disabled,
				registeredBy: serviceCatalogEntry.registeredBy,
				createdAt: serviceCatalogEntry.createdAt,
				updatedAt: serviceCatalogEntry.updatedAt,
			})
			.from(serviceCatalogEntry)
			.where(eq(serviceCatalogEntry.id, serviceId))
			.limit(1);

		if (!service) return null;

		const auditLog = await db
			.select()
			.from(serviceCatalogAuditLog)
			.where(eq(serviceCatalogAuditLog.serviceId, serviceId))
			.orderBy(desc(serviceCatalogAuditLog.createdAt))
			.limit(50);

		return { ...service, auditLog };
	});

export const toggleServiceFn = createServerFn({ method: "POST" })
	.inputValidator((input: { serviceId: string; disabled: boolean }) => input)
	.handler(async ({ data }) => {
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session || session.user.role !== "admin") {
			throw new Error("Unauthorized");
		}

		const { serviceId, disabled } = data;

		const { db } = await import("~/db");
		const { serviceCatalogEntry, serviceCatalogAuditLog } = await import(
			"~/db/schema"
		);
		const { eq } = await import("drizzle-orm");
		const { nanoid } = await import("nanoid");

		await db
			.update(serviceCatalogEntry)
			.set({ disabled, updatedAt: new Date() })
			.where(eq(serviceCatalogEntry.id, serviceId));

		await db.insert(serviceCatalogAuditLog).values({
			id: nanoid(),
			serviceId,
			action: disabled ? "disabled" : "enabled",
			performedBy: session.user.id,
		});

		return { success: true };
	});

export const regenerateServiceApiKeyFn = createServerFn({ method: "POST" })
	.inputValidator((input: { serviceId: string }) => input)
	.handler(async ({ data }) => {
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session || session.user.role !== "admin") {
			throw new Error("Unauthorized");
		}

		const { serviceId } = data;

		const { db } = await import("~/db");
		const { serviceCatalogEntry, serviceCatalogAuditLog } = await import(
			"~/db/schema"
		);
		const { eq } = await import("drizzle-orm");
		const { nanoid } = await import("nanoid");
		const { hash } = await import("bcryptjs");

		const apiKey = `sk_svc_${nanoid(32)}`;
		const apiKeyPrefix = apiKey.slice(0, 12);
		const apiKeyHash = await hash(apiKey, 12);

		await db
			.update(serviceCatalogEntry)
			.set({ apiKeyHash, apiKeyPrefix, updatedAt: new Date() })
			.where(eq(serviceCatalogEntry.id, serviceId));

		await db.insert(serviceCatalogAuditLog).values({
			id: nanoid(),
			serviceId,
			action: "api_key_regenerated",
			performedBy: session.user.id,
		});

		return {
			apiKey,
			message: "Store this API key securely. It will not be shown again.",
		};
	});

export const deleteServiceFn = createServerFn({ method: "POST" })
	.inputValidator((input: { serviceId: string }) => input)
	.handler(async ({ data }) => {
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session || session.user.role !== "admin") {
			throw new Error("Unauthorized");
		}

		const { serviceId } = data;

		const { db } = await import("~/db");
		const { serviceCatalogEntry } = await import("~/db/schema");
		const { eq } = await import("drizzle-orm");

		await db
			.delete(serviceCatalogEntry)
			.where(eq(serviceCatalogEntry.id, serviceId));

		return { success: true };
	});
