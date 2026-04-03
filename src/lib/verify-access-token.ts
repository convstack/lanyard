/**
 * Verify an OAuth2 access token from the Authorization header.
 * Returns the user info if valid, null otherwise.
 *
 * This is different from auth.api.getSession() which validates
 * Better Auth session tokens. OAuth2 access tokens from the OIDC
 * flow are stored in the oauthAccessToken table.
 */
export async function verifyAccessToken(request: Request): Promise<{
	userId: string;
	scopes: string[];
	user: {
		id: string;
		name: string;
		email: string;
		role: string | null;
		image: string | null;
	};
} | null> {
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer ")) return null;

	const token = authorization.slice(7);

	const { db } = await import("~/db");
	const { oauthAccessToken } = await import("~/db/schema");
	const { user } = await import("~/db/schema");
	const { eq } = await import("drizzle-orm");

	// Look up the access token
	const [accessToken] = await db
		.select()
		.from(oauthAccessToken)
		.where(eq(oauthAccessToken.accessToken, token))
		.limit(1);

	if (!accessToken) return null;

	// Check expiry
	if (accessToken.accessTokenExpiresAt < new Date()) return null;

	// Get user
	const [foundUser] = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			image: user.image,
		})
		.from(user)
		.where(eq(user.id, accessToken.userId))
		.limit(1);

	if (!foundUser) return null;

	return {
		userId: accessToken.userId,
		scopes: accessToken.scopes.split(" "),
		user: foundUser,
	};
}

/**
 * Verify a ServiceKey from the Authorization header.
 * Returns the service info if valid, null otherwise.
 *
 * ServiceKey auth grants "service-admin" role — read access to
 * everything but limited write access. Destructive operations
 * (ban, delete user, GDPR execute, delete service) require
 * role === "admin" (human via OIDC) and will reject service-admin.
 */
export async function verifyServiceKey(request: Request): Promise<{
	id: string;
	name: string;
	email: string;
	role: string | null;
	image: string | null;
} | null> {
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("ServiceKey ")) return null;

	const apiKey = authorization.slice(11);
	const prefix = apiKey.slice(0, 12);

	const { db } = await import("~/db");
	const { serviceCatalogEntry } = await import("~/db/schema");
	const { eq } = await import("drizzle-orm");
	const { compare } = await import("bcryptjs");

	// Look up by prefix
	const [service] = await db
		.select({
			id: serviceCatalogEntry.id,
			name: serviceCatalogEntry.name,
			slug: serviceCatalogEntry.slug,
			type: serviceCatalogEntry.type,
			apiKeyHash: serviceCatalogEntry.apiKeyHash,
			disabled: serviceCatalogEntry.disabled,
		})
		.from(serviceCatalogEntry)
		.where(eq(serviceCatalogEntry.apiKeyPrefix, prefix))
		.limit(1);

	if (!service || service.disabled) return null;

	// Verify the full key
	const valid = await compare(apiKey, service.apiKeyHash);
	if (!valid) return null;

	// Return a virtual user representing the service
	// role is "service-admin" — read access + limited writes
	return {
		id: `service:${service.id}`,
		name: service.name,
		email: `${service.slug}@service.internal`,
		role: service.type === "admin" ? "service-admin" : "service",
		image: null,
	};
}

/**
 * Try OAuth2 access token first, then ServiceKey, then Better Auth session.
 * This allows endpoints to work with:
 * - Dashboard (OAuth2 Bearer token)
 * - External services (ServiceKey)
 * - Direct Lanyard UI (session cookie)
 *
 * Roles:
 * - "admin" — full access (human via OIDC or session)
 * - "service-admin" — read access + limited writes (service via ServiceKey)
 * - "staff" — read access to staff-visible resources
 * - "user" — own data only
 * - "service" — minimal access (non-admin services)
 */
export async function getAuthenticatedUser(request: Request): Promise<{
	id: string;
	name: string;
	email: string;
	role: string | null;
	image: string | null;
} | null> {
	// Try OAuth2 access token first
	const oauthResult = await verifyAccessToken(request);
	if (oauthResult) return oauthResult.user;

	// Try ServiceKey
	const serviceResult = await verifyServiceKey(request);
	if (serviceResult) return serviceResult;

	// Fall back to Better Auth session
	const { auth } = await import("~/lib/auth");
	const session = await auth.api.getSession({ headers: request.headers });
	if (session) {
		return {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email,
			role: (session.user as { role?: string | null }).role ?? null,
			image: session.user.image ?? null,
		};
	}

	return null;
}

/**
 * Check if the user has admin-level read access.
 * Both "admin" and "service-admin" can read admin resources.
 */
export function hasAdminReadAccess(role: string | null): boolean {
	return role === "admin" || role === "service-admin";
}

/**
 * Check if the user has admin-level write access.
 * Only "admin" (human via OIDC) can perform destructive operations.
 * "service-admin" (ServiceKey) is read-only for admin resources.
 */
export function hasAdminWriteAccess(role: string | null): boolean {
	return role === "admin";
}

export async function getUserOrganizationIds(
	userId: string,
): Promise<string[]> {
	const { db } = await import("~/db");
	const { member } = await import("~/db/schema");
	const { eq } = await import("drizzle-orm");

	const memberships = await db
		.select({ organizationId: member.organizationId })
		.from(member)
		.where(eq(member.userId, userId));

	return memberships.map((m) => m.organizationId);
}
