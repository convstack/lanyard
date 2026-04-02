import { hash } from "bcryptjs";
import { nanoid } from "nanoid";
import type { UIManifest } from "~/db/schema/service-catalog";
import { LANYARD_ADMIN_MANIFEST } from "~/lib/admin-manifest";
import { MY_ACCOUNT_MANIFEST } from "~/lib/user-manifest";

async function registerService(
	slug: string,
	name: string,
	description: string,
	type: string,
	manifest: UIManifest,
	baseUrl: string,
) {
	const { db } = await import("~/db");
	const { serviceCatalogEntry, serviceCatalogAuditLog } = await import(
		"~/db/schema"
	);
	const { eq } = await import("drizzle-orm");

	const [existing] = await db
		.select({ id: serviceCatalogEntry.id })
		.from(serviceCatalogEntry)
		.where(eq(serviceCatalogEntry.slug, slug))
		.limit(1);

	if (existing) {
		await db
			.update(serviceCatalogEntry)
			.set({
				uiManifest: manifest,
				baseUrl,
				status: "active",
				lastHealthCheck: new Date(),
				lastHealthStatus: "healthy",
				consecutiveFailures: 0,
				updatedAt: new Date(),
			})
			.where(eq(serviceCatalogEntry.id, existing.id));
		console.log(`Service "${slug}" manifest updated`);
		return;
	}

	const id = nanoid();
	const apiKey = `sk_svc_${nanoid(32)}`;
	const apiKeyHash = await hash(apiKey, 10);
	const apiKeyPrefix = apiKey.slice(0, 12);

	await db.insert(serviceCatalogEntry).values({
		id,
		name,
		slug,
		type,
		description,
		version: "1.0.0",
		baseUrl,
		healthCheckPath: "/api/health",
		uiManifest: manifest,
		apiKeyHash,
		apiKeyPrefix,
		status: "active",
		lastHealthCheck: new Date(),
		lastHealthStatus: "healthy",
		consecutiveFailures: 0,
		disabled: false,
		registeredBy: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	await db.insert(serviceCatalogAuditLog).values({
		id: nanoid(),
		serviceId: id,
		action: "registered",
		details: { name, slug },
		performedBy: "system",
		createdAt: new Date(),
	});

	console.log(`Service "${slug}" registered in catalog`);
}

export async function registerLanyardAsService() {
	const BASE_URL =
		process.env.LANYARD_BASE_URL ||
		`http://localhost:${process.env.PORT || 3000}`;

	try {
		await registerService(
			"lanyard-admin",
			"Lanyard Administration",
			"Identity provider and service catalog administration",
			"admin",
			LANYARD_ADMIN_MANIFEST,
			BASE_URL,
		);
		await registerService(
			"my-account",
			"My Account",
			"User profile, sessions, and account settings",
			"user",
			MY_ACCOUNT_MANIFEST,
			BASE_URL,
		);
	} catch (error) {
		console.warn("Failed to self-register Lanyard services:", error);
	}
}
