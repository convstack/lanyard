import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const oauthApplication = pgTable("oauth_application", {
	id: text("id").primaryKey(),
	name: text("name"),
	icon: text("icon"),
	clientId: text("client_id").notNull().unique(),
	clientSecret: text("client_secret").notNull(),
	redirectUrls: text("redirect_ur_ls").notNull(),
	type: text("type").notNull().default("confidential"),
	metadata: text("metadata"),
	disabled: boolean("disabled").default(false),
	userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const oauthAccessToken = pgTable("oauth_access_token", {
	id: text("id").primaryKey(),
	accessToken: text("access_token").notNull(),
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
