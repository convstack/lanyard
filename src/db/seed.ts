import { hashPassword } from "better-auth/crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { nanoid } from "nanoid";
import { account, brandingConfig, oauthApplication, user } from "./schema";

function generatePassword(length = 16): string {
	const chars =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => chars[b % chars.length]).join("");
}

async function seed() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error("DATABASE_URL is required");
	const db = drizzle(databaseUrl);

	console.log("Seeding database...");

	const adminPassword = generatePassword();
	const userPassword = generatePassword();
	const clientId = nanoid();
	const clientSecret = nanoid(32);

	// Create admin user
	const adminId = nanoid();
	const adminPasswordHash = await hashPassword(adminPassword);
	await db
		.insert(user)
		.values({
			id: adminId,
			name: "Admin",
			email: "admin@lanyard.local",
			emailVerified: true,
			username: "admin",
			displayUsername: "Admin",
			role: "admin",
		})
		.onConflictDoNothing();

	await db
		.insert(account)
		.values({
			id: nanoid(),
			accountId: adminId,
			providerId: "credential",
			userId: adminId,
			password: adminPasswordHash,
		})
		.onConflictDoNothing();

	// Create test user
	const userId = nanoid();
	const userPasswordHash = await hashPassword(userPassword);
	await db
		.insert(user)
		.values({
			id: userId,
			name: "Test User",
			email: "user@lanyard.local",
			emailVerified: true,
			username: "testuser",
			displayUsername: "TestUser",
			role: "user",
		})
		.onConflictDoNothing();

	await db
		.insert(account)
		.values({
			id: nanoid(),
			accountId: userId,
			providerId: "credential",
			userId: userId,
			password: userPasswordHash,
		})
		.onConflictDoNothing();

	// Create test OIDC client
	await db
		.insert(oauthApplication)
		.values({
			id: nanoid(),
			name: "Test Application",
			clientId,
			clientSecret,
			redirectUris: "http://localhost:4000/callback",
			type: "confidential",
			userId: adminId,
		})
		.onConflictDoNothing();

	// Create default branding
	await db
		.insert(brandingConfig)
		.values({
			id: nanoid(),
			appName: "Lanyard",
		})
		.onConflictDoNothing();

	console.log("");
	console.log("Seed complete. Save these credentials:");
	console.log("----------------------------------------");
	console.log(`Admin: admin@lanyard.local / ${adminPassword}`);
	console.log(`User:  user@lanyard.local / ${userPassword}`);
	console.log(`OIDC Client ID:     ${clientId}`);
	console.log(`OIDC Client Secret: ${clientSecret}`);
	console.log("----------------------------------------");

	process.exit(0);
}

seed().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
