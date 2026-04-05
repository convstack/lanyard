import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../../db";
import { serviceCatalogAuditLog, serviceCatalogEntry } from "../../db/schema";

const HEALTH_CHECK_INTERVAL_MS = 60_000;
const HEALTH_CHECK_TIMEOUT_MS = 5_000;
const DEGRADED_THRESHOLD = 3;
const INACTIVE_THRESHOLD = 10;

async function checkServiceHealth(
	service: typeof serviceCatalogEntry.$inferSelect,
) {
	try {
		const url = `${service.baseUrl}${service.healthCheckPath}`;
		const controller = new AbortController();
		const timeout = setTimeout(
			() => controller.abort(),
			HEALTH_CHECK_TIMEOUT_MS,
		);

		const response = await fetch(url, {
			method: "GET",
			signal: controller.signal,
		});
		clearTimeout(timeout);

		if (response.ok) {
			const previousStatus = service.status;
			await db
				.update(serviceCatalogEntry)
				.set({
					lastHealthCheck: new Date(),
					lastHealthStatus: "healthy",
					consecutiveFailures: 0,
					status: previousStatus === "maintenance" ? "maintenance" : "active",
					updatedAt: new Date(),
				})
				.where(eq(serviceCatalogEntry.id, service.id));

			if (previousStatus === "degraded" || previousStatus === "inactive") {
				await db.insert(serviceCatalogAuditLog).values({
					id: nanoid(),
					serviceId: service.id,
					action: "health_changed",
					details: { from: previousStatus, to: "active" },
					performedBy: "system",
				});
			}
		} else {
			await recordFailure(service, `HTTP ${response.status}`);
		}
	} catch (error) {
		const reason =
			error instanceof Error && error.name === "AbortError"
				? "timeout"
				: "unreachable";
		await recordFailure(service, reason);
	}
}

async function recordFailure(
	service: typeof serviceCatalogEntry.$inferSelect,
	reason: string,
) {
	const failures = service.consecutiveFailures + 1;
	let newStatus = service.status;

	if (
		failures >= INACTIVE_THRESHOLD &&
		service.status !== "inactive" &&
		service.status !== "maintenance"
	) {
		newStatus = "inactive";
	} else if (failures >= DEGRADED_THRESHOLD && service.status === "active") {
		newStatus = "degraded";
	}

	await db
		.update(serviceCatalogEntry)
		.set({
			lastHealthCheck: new Date(),
			lastHealthStatus: reason,
			consecutiveFailures: failures,
			status: newStatus,
			updatedAt: new Date(),
		})
		.where(eq(serviceCatalogEntry.id, service.id));

	if (newStatus !== service.status) {
		await db.insert(serviceCatalogAuditLog).values({
			id: nanoid(),
			serviceId: service.id,
			action: "health_changed",
			details: {
				from: service.status,
				to: newStatus,
				reason,
				consecutiveFailures: failures,
			},
			performedBy: "system",
		});
	}
}

export async function runHealthChecks() {
	try {
		const services = await db
			.select()
			.from(serviceCatalogEntry)
			.where(eq(serviceCatalogEntry.disabled, false));

		await Promise.allSettled(
			services.map((service) => checkServiceHealth(service)),
		);
	} catch (error) {
		console.error("Health check cycle failed:", error);
	}
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startHealthChecker() {
	if (intervalId) return;
	console.log(
		`Health checker started (interval: ${HEALTH_CHECK_INTERVAL_MS / 1000}s)`,
	);
	// Run first check after a short delay to let the server fully start
	setTimeout(() => {
		runHealthChecks();
		intervalId = setInterval(runHealthChecks, HEALTH_CHECK_INTERVAL_MS);
	}, 5_000);
}

export function stopHealthChecker() {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
}
