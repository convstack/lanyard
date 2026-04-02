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
 * Try OAuth2 access token first, fall back to Better Auth session.
 * This allows endpoints to work with both Dashboard (OAuth2) and
 * direct Lanyard (session cookie) authentication.
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
