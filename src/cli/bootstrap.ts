/**
 * CLI bootstrap for emergency Lanyard setup when Dashboard is unavailable.
 * Usage: bun run lanyard:setup
 */

async function main() {
	console.log("=== Lanyard Bootstrap Setup ===\n");

	const { db } = await import("~/db");
	const { user } = await import("~/db/schema");
	const { count } = await import("drizzle-orm");

	const [userCount] = await db.select({ count: count() }).from(user);

	if (userCount && userCount.count > 0) {
		console.log(`Database already has ${userCount.count} users.`);
		console.log(
			"To create a new admin user, use the Lanyard API or Dashboard.",
		);
		console.log("\nEnvironment check:");
		console.log(
			`  DATABASE_URL: ${process.env.DATABASE_URL ? "set" : "NOT SET"}`,
		);
		console.log(`  PORT: ${process.env.PORT || "3000 (default)"}`);
		console.log(
			`  BETTER_AUTH_SECRET: ${process.env.BETTER_AUTH_SECRET ? "set" : "NOT SET"}`,
		);
		return;
	}

	console.log("No users found. Creating initial admin account...\n");

	const email = process.env.ADMIN_EMAIL || "admin@localhost";
	const password = process.env.ADMIN_PASSWORD || generatePassword();
	const name = process.env.ADMIN_NAME || "Administrator";

	const { auth } = await import("~/lib/auth");
	const result = await auth.api.signUpEmail({
		body: { email, password, name },
	});

	if (!result || !result.user) {
		console.error("Failed to create admin user.");
		process.exit(1);
	}

	const { eq } = await import("drizzle-orm");
	await db
		.update(user)
		.set({ role: "admin", emailVerified: true })
		.where(eq(user.id, result.user.id));

	console.log("Admin user created successfully!\n");
	console.log(`  Email:    ${email}`);
	if (!process.env.ADMIN_PASSWORD) {
		console.log(`  Password: ${password}`);
		console.log("\n  Save this password - it will not be shown again.");
	}
	console.log("\nYou can now start Lanyard and sign in via the Dashboard.");
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
