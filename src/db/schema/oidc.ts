import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Better Auth's oauth-provider plugin manages these tables internally.
// They are excluded from drizzle-kit.ts (used for migrations) to avoid
// duplicate column errors. They ARE exported from index.ts for runtime
// Drizzle queries in our own code (bootstrap, verify-access-token, admin).

export const oauthClient = pgTable("oauth_client", {
	id: text("id").primaryKey(),
	clientId: text("client_id").notNull().unique(),
	clientSecret: text("client_secret"),
	name: text("name"),
	icon: text("icon"),
	type: text("type"),
	disabled: boolean("disabled").default(false),
	redirectUris: text("redirect_uris"),
	userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
	metadata: text("metadata"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Alias for backward compatibility
export const oauthApplication = oauthClient;

export const oauthAccessToken = pgTable("oauth_access_token", {
	id: text("id").primaryKey(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	clientId: text("client_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	scopes: text("scopes").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const oauthRefreshToken = pgTable("oauth_refresh_token", {
	id: text("id").primaryKey(),
	token: text("token").notNull(),
	clientId: text("client_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	scopes: text("scopes").notNull(),
	expiresAt: timestamp("expires_at"),
	createdAt: timestamp("created_at").defaultNow(),
	revoked: timestamp("revoked"),
});

export const oauthConsent = pgTable("oauth_consent", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	clientId: text("client_id").notNull(),
	scopes: text("scopes").notNull(),
	consentGiven: boolean("consent_given").notNull().default(false),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const oauthAuthorizationCode = pgTable("oauth_authorization_code", {
	id: text("id").primaryKey(),
	code: text("code").notNull(),
	clientId: text("client_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	scopes: text("scopes").notNull(),
	redirectURI: text("redirect_uri").notNull(),
	codeChallenge: text("code_challenge"),
	codeChallengeMethod: text("code_challenge_method"),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
