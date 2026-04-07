import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

// All fields match @better-auth/oauth-provider's internal schema exactly.
// Tables are excluded from drizzle-kit.ts to avoid duplicate column errors.

export const oauthClient = pgTable("oauth_client", {
	id: text("id").primaryKey(),
	clientId: text("client_id").notNull().unique(),
	clientSecret: text("client_secret"),
	disabled: boolean("disabled").default(false),
	skipConsent: boolean("skip_consent"),
	enableEndSession: boolean("enable_end_session"),
	subjectType: text("subject_type"),
	scopes: text("scopes").array(),
	userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	name: text("name"),
	uri: text("uri"),
	icon: text("icon"),
	contacts: text("contacts").array(),
	tos: text("tos"),
	policy: text("policy"),
	softwareId: text("software_id"),
	softwareVersion: text("software_version"),
	softwareStatement: text("software_statement"),
	redirectUris: text("redirect_uris").array(),
	postLogoutRedirectUris: text("post_logout_redirect_uris").array(),
	tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
	grantTypes: text("grant_types").array(),
	responseTypes: text("response_types").array(),
	public: boolean("public"),
	type: text("type"),
	requirePKCE: boolean("require_pkce"),
	referenceId: text("reference_id"),
	metadata: text("metadata"),
});

export const oauthApplication = oauthClient;

export const oauthAccessToken = pgTable("oauth_access_token", {
	id: text("id").primaryKey(),
	token: text("token"),
	clientId: text("client_id").notNull(),
	sessionId: text("session_id"),
	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
	referenceId: text("reference_id"),
	refreshId: text("refresh_id"),
	expiresAt: timestamp("expires_at"),
	createdAt: timestamp("created_at").defaultNow(),
	scopes: text("scopes").array(),
	// Legacy columns from oidc-provider (kept for backward compat)
	accessToken: text("access_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
});

export const oauthRefreshToken = pgTable("oauth_refresh_token", {
	id: text("id").primaryKey(),
	token: text("token").notNull(),
	clientId: text("client_id").notNull(),
	sessionId: text("session_id"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	referenceId: text("reference_id"),
	expiresAt: timestamp("expires_at"),
	createdAt: timestamp("created_at").defaultNow(),
	revoked: timestamp("revoked"),
	authTime: timestamp("auth_time"),
	scopes: text("scopes").array().notNull(),
});

export const oauthConsent = pgTable("oauth_consent", {
	id: text("id").primaryKey(),
	clientId: text("client_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	referenceId: text("reference_id"),
	scopes: text("scopes").array(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export const oauthAuthorizationCode = pgTable("oauth_authorization_code", {
	id: text("id").primaryKey(),
	code: text("code").notNull(),
	clientId: text("client_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	scopes: text("scopes").array(),
	redirectURI: text("redirect_uri").notNull(),
	codeChallenge: text("code_challenge"),
	codeChallengeMethod: text("code_challenge_method"),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
