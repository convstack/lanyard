import { passkey } from "@better-auth/passkey";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
	admin,
	jwt,
	oidcProvider,
	organization,
	twoFactor,
	username,
} from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "../db";
import * as schema from "../db/schema";
import { sendEmail } from "./email";

// Load OAuth settings from DB (falls back to env vars)
let dbSettings: {
	discordClientId?: string | null;
	discordClientSecret?: string | null;
	googleClientId?: string | null;
	googleClientSecret?: string | null;
	githubClientId?: string | null;
	githubClientSecret?: string | null;
} = {};

try {
	const { appSettings } = await import("~/db/schema");
	const [row] = await db.select().from(appSettings).limit(1);
	if (row) dbSettings = row;
} catch {
	// DB not ready yet (e.g. first run before migrations)
}

function buildSocialProviders(): BetterAuthOptions["socialProviders"] {
	const providers: BetterAuthOptions["socialProviders"] = {};

	const discordId = dbSettings.discordClientId || process.env.DISCORD_CLIENT_ID;
	const discordSecret =
		dbSettings.discordClientSecret || process.env.DISCORD_CLIENT_SECRET;
	if (discordId && discordSecret) {
		providers.discord = {
			clientId: discordId,
			clientSecret: discordSecret,
		};
	}

	const googleId = dbSettings.googleClientId || process.env.GOOGLE_CLIENT_ID;
	const googleSecret =
		dbSettings.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;
	if (googleId && googleSecret) {
		providers.google = {
			clientId: googleId,
			clientSecret: googleSecret,
		};
	}

	const githubId = dbSettings.githubClientId || process.env.GITHUB_CLIENT_ID;
	const githubSecret =
		dbSettings.githubClientSecret || process.env.GITHUB_CLIENT_SECRET;
	if (githubId && githubSecret) {
		providers.github = {
			clientId: githubId,
			clientSecret: githubSecret,
		};
	}

	return Object.keys(providers).length > 0 ? providers : undefined;
}

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	baseURL: process.env.BETTER_AUTH_URL,
	secret: process.env.BETTER_AUTH_SECRET,

	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
	},

	socialProviders: buildSocialProviders(),

	emailVerification: {
		sendOnSignUp: true,
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				subject: "Verify your email - Lanyard",
				html: `<p>Hi ${user.name},</p><p>Click <a href="${url}">here</a> to verify your email address.</p>`,
			});
		},
	},

	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
		},
	},

	plugins: [
		jwt(),
		oidcProvider({
			loginPage: "/login",
			consentPage: "/oauth/consent",
			accessTokenExpiresIn: 86400, // 24 hours
			refreshTokenExpiresIn: 30 * 86400, // 30 days
			getAdditionalUserInfoClaim: async (user) => ({
				role: (user as { role?: string }).role ?? "user",
			}),
		}),
		admin(),
		twoFactor({
			issuer: process.env.APP_NAME || "Lanyard",
		}),
		username(),
		organization({
			allowUserToCreateOrganization: false,
		}),
		passkey({
			rpName: process.env.APP_NAME || "Lanyard",
		}),
		tanstackStartCookies(), // must be last plugin
	],
});

export type Session = typeof auth.$Infer.Session;
