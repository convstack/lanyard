import { hash } from "bcryptjs";
import { nanoid } from "nanoid";
import type { UIManifest } from "~/db/schema/service-catalog";
import { LANYARD_ADMIN_MANIFEST } from "~/lib/admin-manifest";
import { DEPARTMENTS_MANIFEST } from "~/lib/departments-manifest";
import { MY_ACCOUNT_MANIFEST } from "~/lib/user-manifest";
import pkg from "../../../package.json";

interface ServiceOptions {
	slug: string;
	name: string;
	description: string;
	type: string;
	visibility?: string;
	manifest: UIManifest;
	baseUrl: string;
	backchannelLogoutUrl?: string;
	frontchannelLogoutUrl?: string;
}

async function registerService(opts: ServiceOptions) {
	const { db } = await import("~/db");
	const { serviceCatalogEntry, serviceCatalogAuditLog } = await import(
		"~/db/schema"
	);
	const { eq } = await import("drizzle-orm");

	const [existing] = await db
		.select({ id: serviceCatalogEntry.id })
		.from(serviceCatalogEntry)
		.where(eq(serviceCatalogEntry.slug, opts.slug))
		.limit(1);

	if (existing) {
		await db
			.update(serviceCatalogEntry)
			.set({
				uiManifest: opts.manifest,
				baseUrl: opts.baseUrl,
				visibility: opts.visibility ?? "all",
				backchannelLogoutUrl: opts.backchannelLogoutUrl ?? null,
				frontchannelLogoutUrl: opts.frontchannelLogoutUrl ?? null,
				status: "active",
				lastHealthCheck: new Date(),
				lastHealthStatus: "healthy",
				consecutiveFailures: 0,
				updatedAt: new Date(),
			})
			.where(eq(serviceCatalogEntry.id, existing.id));
		console.log(`Service "${opts.slug}" manifest updated`);
		return;
	}

	const id = nanoid();
	const apiKey = `sk_svc_${nanoid(32)}`;
	const apiKeyHash = await hash(apiKey, 10);
	const apiKeyPrefix = apiKey.slice(0, 12);

	await db.insert(serviceCatalogEntry).values({
		id,
		name: opts.name,
		slug: opts.slug,
		type: opts.type,
		visibility: opts.visibility ?? "all",
		description: opts.description,
		version: pkg.version,
		baseUrl: opts.baseUrl,
		healthCheckPath: "/api/health",
		uiManifest: opts.manifest,
		apiKeyHash,
		apiKeyPrefix,
		status: "active",
		lastHealthCheck: new Date(),
		lastHealthStatus: "healthy",
		consecutiveFailures: 0,
		disabled: false,
		backchannelLogoutUrl: opts.backchannelLogoutUrl ?? null,
		frontchannelLogoutUrl: opts.frontchannelLogoutUrl ?? null,
		registeredBy: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	await db.insert(serviceCatalogAuditLog).values({
		id: nanoid(),
		serviceId: id,
		action: "registered",
		details: { name: opts.name, slug: opts.slug },
		performedBy: "system",
		createdAt: new Date(),
	});

	console.log(`Service "${opts.slug}" registered in catalog`);
}

export async function registerLanyardAsService() {
	const BASE_URL =
		process.env.LANYARD_BASE_URL ||
		`http://localhost:${process.env.PORT || 3000}`;
	const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:4000";

	try {
		await registerService({
			slug: "lanyard-admin",
			name: "Lanyard Administration",
			description: "Identity provider and service catalog administration",
			type: "admin",
			visibility: "admin",
			manifest: LANYARD_ADMIN_MANIFEST,
			baseUrl: BASE_URL,
		});
		await registerService({
			slug: "my-account",
			name: "My Account",
			description: "User profile, sessions, and account settings",
			type: "user",
			visibility: "all",
			manifest: MY_ACCOUNT_MANIFEST,
			baseUrl: BASE_URL,
			backchannelLogoutUrl: `${DASHBOARD_URL}/api/auth/backchannel-logout`,
		});
		await registerService({
			slug: "departments",
			name: "Departments",
			description: "Department and team management",
			type: "user",
			visibility: "staff",
			manifest: DEPARTMENTS_MANIFEST,
			baseUrl: BASE_URL,
		});
	} catch (error) {
		console.warn("Failed to self-register Lanyard services:", error);
	}
}
