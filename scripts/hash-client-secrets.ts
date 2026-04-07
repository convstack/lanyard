/**
 * Hashes existing plain-text OAuth client secrets using SHA-256 + base64url.
 * Required for migration from oidc-provider to @better-auth/oauth-provider.
 *
 * Usage: bun run scripts/hash-client-secrets.ts
 */

import { createHash } from "@better-auth/utils/hash";
import { base64Url } from "@better-auth/utils/base64";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const db = drizzle(databaseUrl);

const oauthClient = pgTable("oauth_client", {
	id: text("id").primaryKey(),
	clientId: text("client_id").notNull(),
	clientSecret: text("client_secret"),
});

async function hashSecret(value: string): Promise<string> {
	const hash = await createHash("SHA-256").digest(
		new TextEncoder().encode(value),
	);
	return base64Url.encode(new Uint8Array(hash), { padding: false });
}

async function main() {
	const clients = await db
		.select()
		.from(oauthClient);

	let updated = 0;
	for (const client of clients) {
		if (!client.clientSecret) continue;

		// Skip if already hashed (base64url is 43 chars for SHA-256)
		if (client.clientSecret.length === 43 && /^[A-Za-z0-9_-]+$/.test(client.clientSecret)) {
			console.log(`${client.clientId}: already hashed, skipping`);
			continue;
		}

		const hashed = await hashSecret(client.clientSecret);
		await db
			.update(oauthClient)
			.set({ clientSecret: hashed })
			.where(eq(oauthClient.id, client.id));

		console.log(`${client.clientId}: hashed (${client.clientSecret.slice(0, 8)}... → ${hashed.slice(0, 8)}...)`);
		updated++;
	}

	console.log(`\nDone. ${updated} secret(s) hashed.`);
	process.exit(0);
}

main().catch((err) => {
	console.error("Failed:", err);
	process.exit(1);
});
