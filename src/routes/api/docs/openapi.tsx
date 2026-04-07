import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";

interface OpenAPISpec {
	openapi: string;
	info: { title: string; version: string };
	paths: Record<string, unknown>;
}

// Cache for 60 seconds
let cache: { spec: string; fetchedAt: number } | null = null;
const CACHE_TTL = 60_000;

async function fetchServiceSpec(baseUrl: string): Promise<OpenAPISpec | null> {
	try {
		const res = await fetch(`${baseUrl}/api/openapi`, {
			signal: AbortSignal.timeout(3000),
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

async function buildAggregatedSpec(): Promise<string> {
	if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
		return cache.spec;
	}

	const { db } = await import("~/db");
	const { serviceCatalogEntry } = await import("~/db/schema");
	const { eq } = await import("drizzle-orm");

	const services = await db
		.select({
			slug: serviceCatalogEntry.slug,
			name: serviceCatalogEntry.name,
			baseUrl: serviceCatalogEntry.baseUrl,
		})
		.from(serviceCatalogEntry)
		.where(eq(serviceCatalogEntry.disabled, false));

	// Start with Lanyard's own spec
	let lanyardSpec: OpenAPISpec;
	try {
		lanyardSpec = JSON.parse(
			readFileSync(join(process.cwd(), "public", "openapi.json"), "utf-8"),
		);
	} catch {
		lanyardSpec = {
			openapi: "3.0.3",
			info: { title: "Lanyard", version: "0.1.0" },
			paths: {},
		};
	}

	const mergedPaths: Record<string, unknown> = {};
	const tags: Array<{ name: string; description: string }> = [
		{ name: "lanyard", description: "Lanyard (Identity & Service Catalog)" },
	];

	// Add Lanyard's own paths
	for (const [path, methods] of Object.entries(lanyardSpec.paths)) {
		mergedPaths[path] = retagMethods(
			methods as Record<string, unknown>,
			"lanyard",
		);
	}

	// Fetch and merge each service's spec
	const fetches = services
		.filter(
			(s) =>
				s.slug !== "lanyard-admin" &&
				s.slug !== "my-account" &&
				s.slug !== "departments",
		)
		.map(async (service) => {
			const spec = await fetchServiceSpec(service.baseUrl);
			if (!spec?.paths) return;

			tags.push({
				name: service.slug,
				description: service.name,
			});

			for (const [path, methods] of Object.entries(spec.paths)) {
				// Prefix paths with service slug for clarity
				const prefixedPath = `/${service.slug}${path}`;
				mergedPaths[prefixedPath] = retagMethods(
					methods as Record<string, unknown>,
					service.slug,
				);
			}
		});

	await Promise.allSettled(fetches);

	const pkg = JSON.parse(
		readFileSync(join(process.cwd(), "package.json"), "utf-8"),
	);

	const aggregated = {
		openapi: "3.0.3",
		info: {
			title: "ConvStack API",
			version: pkg.version || "0.1.0",
			description: "Aggregated API documentation for all ConvStack services.",
		},
		tags,
		paths: mergedPaths,
	};

	const spec = JSON.stringify(aggregated);
	cache = { spec, fetchedAt: Date.now() };
	return spec;
}

function retagMethods(
	methods: Record<string, unknown>,
	tag: string,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [method, operation] of Object.entries(methods)) {
		if (typeof operation === "object" && operation !== null) {
			result[method] = {
				...(operation as Record<string, unknown>),
				tags: [tag],
			};
		} else {
			result[method] = operation;
		}
	}
	return result;
}

export const Route = createFileRoute("/api/docs/openapi")({
	server: {
		handlers: {
			GET: async () => {
				const spec = await buildAggregatedSpec();
				return new Response(spec, {
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				});
			},
		},
	},
});
