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

function buildSocialProviders(): BetterAuthOptions["socialProviders"] {
	const providers: BetterAuthOptions["socialProviders"] = {};

	if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
		providers.discord = {
			clientId: process.env.DISCORD_CLIENT_ID,
			clientSecret: process.env.DISCORD_CLIENT_SECRET,
		};
	}

	if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
		providers.google = {
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		};
	}

	if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
		providers.github = {
			clientId: process.env.GITHUB_CLIENT_ID,
			clientSecret: process.env.GITHUB_CLIENT_SECRET,
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
