/**
 * CLI bootstrap for emergency Lanyard setup when Dashboard is unavailable.
 *
 * Usage:
 *   bun run lanyard:setup <name> <email> [password]
 *
 * Examples:
 *   bun run lanyard:setup "Admin" admin@example.com
 *   bun run lanyard:setup "Admin" admin@example.com mypassword123
 *
 * Also registers the Dashboard as an OIDC client if not already present.
 * Set DASHBOARD_CLIENT_ID, DASHBOARD_CLIENT_SECRET, and DASHBOARD_URL
 * in the .env to control the client credentials.
 */

async function main() {
	console.log("=== Lanyard Bootstrap Setup ===\n");

	const { db } = await import("~/db");
	const { user, oauthApplication } = await import("~/db/schema");
	const { count, eq } = await import("drizzle-orm");

	// --- Dashboard OIDC client registration ---
	const clientId = process.env.DASHBOARD_CLIENT_ID || "dashboard";
	const clientSecret = process.env.DASHBOARD_CLIENT_SECRET || "";
	const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:4000";

	if (clientSecret) {
		try {
			const [existing] = await db
				.select({ id: oauthApplication.id })
				.from(oauthApplication)
				.where(eq(oauthApplication.clientId, clientId))
				.limit(1);

			if (existing) {
				console.log(
					`Dashboard OIDC client "${clientId}" already registered.\n`,
				);
			} else {
				const { nanoid } = await import("nanoid");

				// Store secret as plain text — Better Auth's default
				// storeClientSecret mode uses plain text comparison
				await db.insert(oauthApplication).values({
					id: nanoid(),
					name: "Convention Dashboard",
					clientId,
					clientSecret,
					redirectUrls: `${dashboardUrl}/callback`,
					type: "confidential",
					disabled: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				console.log("Dashboard OIDC client registered!\n");
				console.log(`  Client ID:     ${clientId}`);
				console.log(`  Redirect URL:  ${dashboardUrl}/callback\n`);
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			console.warn(`Warning: Could not register Dashboard client: ${msg}\n`);
		}
	} else {
		console.log(
			"Skipping Dashboard OIDC client — DASHBOARD_CLIENT_SECRET not set.\n",
		);
	}

	// --- Admin user creation ---
	const [userCount] = await db.select({ count: count() }).from(user);

	if (userCount && userCount.count > 0) {
		console.log(`Database already has ${userCount.count} users.`);
		console.log(
			"To create a new admin user, use the Lanyard API or Dashboard.\n",
		);
		console.log("Environment check:");
		console.log(
			`  DATABASE_URL: ${process.env.DATABASE_URL ? "set" : "NOT SET"}`,
		);
		console.log(`  PORT: ${process.env.PORT || "3000 (default)"}`);
		console.log(
			`  BETTER_AUTH_SECRET: ${process.env.BETTER_AUTH_SECRET ? "set" : "NOT SET"}`,
		);
		return;
	}

	const [name, email, password] = process.argv.slice(2);

	if (!name || !email) {
		console.log("No users found. To create the initial admin account:\n");
		console.log("  bun run lanyard:setup <name> <email> [password]\n");
		console.log("Arguments:");
		console.log("  name       Display name for the admin account");
		console.log("  email      Email address (must be valid)");
		console.log("  password   Optional — auto-generated if omitted\n");
		console.log("Examples:");
		console.log('  bun run lanyard:setup "Admin" admin@example.com');
		console.log(
			'  bun run lanyard:setup "Admin" admin@example.com mypassword123',
		);
		return;
	}

	if (!email.includes("@") || !email.includes(".")) {
		console.error(`Invalid email address: ${email}`);
		process.exit(1);
	}

	const finalPassword = password || generatePassword();

	console.log("No users found. Creating initial admin account...\n");

	const { auth } = await import("~/lib/auth");

	try {
		const result = await auth.api.signUpEmail({
			body: { email, password: finalPassword, name },
		});

		if (!result || !result.user) {
			console.error("Failed to create admin user.");
			process.exit(1);
		}

		await db
			.update(user)
			.set({ role: "admin", emailVerified: true })
			.where(eq(user.id, result.user.id));

		console.log("Admin user created successfully!\n");
		console.log(`  Name:     ${name}`);
		console.log(`  Email:    ${email}`);
		if (!password) {
			console.log(`  Password: ${finalPassword}`);
			console.log("\n  Save this password - it will not be shown again.");
		}
		console.log("\nYou can now start Lanyard and sign in via the Dashboard.");
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("Failed to create admin user.\n");
		console.error(`  Error: ${message}\n`);
		console.error("Check that:");
		console.error("  - Email is a valid email address");
		console.error("  - Password is at least 8 characters (if provided)");
		console.error("  - DATABASE_URL is correct and the database is running");
		process.exit(1);
	}
}

function generatePassword(): string {
	const chars =
		"abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
	let password = "";
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	for (const byte of bytes) {
		password += chars[byte % chars.length];
	}
	return password;
}

main().catch((err) => {
	console.error("Bootstrap failed:", err);
	process.exit(1);
});
