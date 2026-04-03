/**
 * Propagate logout to all registered services that have backchannel logout URLs.
 * Called when a user is banned, or their sessions are revoked.
 */
export async function propagateLogout(userId: string) {
	const { db } = await import("~/db");
	const { serviceCatalogEntry } = await import("~/db/schema");
	const { eq, and, isNotNull } = await import("drizzle-orm");

	// Find all services with backchannel logout URLs
	const services = await db
		.select({
			slug: serviceCatalogEntry.slug,
			backchannelLogoutUrl: serviceCatalogEntry.backchannelLogoutUrl,
		})
		.from(serviceCatalogEntry)
		.where(
			and(
				eq(serviceCatalogEntry.disabled, false),
				isNotNull(serviceCatalogEntry.backchannelLogoutUrl),
			),
		);

	// Notify each service in parallel
	await Promise.allSettled(
		services
			.filter((s) => s.backchannelLogoutUrl)
			.map(async (service) => {
				try {
					await fetch(service.backchannelLogoutUrl!, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ userId }),
						signal: AbortSignal.timeout(5000),
					});
				} catch {
					console.warn(`Backchannel logout failed for ${service.slug}`);
				}
			}),
	);
}

/**
 * Revoke all OAuth2 access tokens for a user.
 * This ensures they can't use existing tokens after being banned.
 */
export async function revokeUserTokens(userId: string) {
	const { db } = await import("~/db");
	const { oauthAccessToken } = await import("~/db/schema");
	const { eq } = await import("drizzle-orm");

	await db.delete(oauthAccessToken).where(eq(oauthAccessToken.userId, userId));
}
