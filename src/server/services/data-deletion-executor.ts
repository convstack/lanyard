import { deleteFile } from "~/lib/s3";

export async function executeDataDeletion(requestId: string): Promise<void> {
	const { db } = await import("~/db");
	const {
		dataDeletionRequest,
		user,
		session: sessionTable,
		account,
		oauthAccessToken,
		oauthConsent,
		passkey,
		twoFactor,
		member,
		teamMember,
	} = await import("~/db/schema");
	const { eq } = await import("drizzle-orm");

	// 1. Load the deletion request
	const [request] = await db
		.select()
		.from(dataDeletionRequest)
		.where(eq(dataDeletionRequest.id, requestId))
		.limit(1);

	if (!request || request.status !== "accepted") {
		throw new Error("Request not found or not accepted");
	}

	const userId = request.userId;
	if (!userId) {
		throw new Error("User already deleted");
	}

	// 2. Load the user to get avatar URL
	const [userRecord] = await db
		.select({ image: user.image })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	// 3. Delete S3 avatar if exists
	if (userRecord?.image) {
		try {
			await deleteFile(userRecord.image);
		} catch {
			// Non-blocking — continue even if avatar deletion fails
		}
	}

	// 4. Delete sessions
	try {
		await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
	} catch {}

	// 5. Delete OAuth access tokens
	try {
		await db
			.delete(oauthAccessToken)
			.where(eq(oauthAccessToken.userId, userId));
	} catch {}

	// 6. Delete OAuth consents
	try {
		await db.delete(oauthConsent).where(eq(oauthConsent.userId, userId));
	} catch {}

	// 7. Delete passkeys
	try {
		await db.delete(passkey).where(eq(passkey.userId, userId));
	} catch {}

	// 8. Delete two-factor records
	try {
		await db.delete(twoFactor).where(eq(twoFactor.userId, userId));
	} catch {}

	// 9. Delete team memberships
	try {
		await db.delete(teamMember).where(eq(teamMember.userId, userId));
	} catch {}

	// 10. Delete organization memberships
	try {
		await db.delete(member).where(eq(member.userId, userId));
	} catch {}

	// 11. Delete accounts (social login links)
	try {
		await db.delete(account).where(eq(account.userId, userId));
	} catch {}

	// 12. Delete the user record
	await db.delete(user).where(eq(user.id, userId));

	// 13. Mark request as resolved
	await db
		.update(dataDeletionRequest)
		.set({
			status: "resolved",
			deletedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(dataDeletionRequest.id, requestId));

	// 14. Propagate logout to all services
	try {
		const { propagateLogout, revokeUserTokens } = await import(
			"~/server/services/logout-propagation"
		);
		await revokeUserTokens(userId);
		await propagateLogout(userId);
	} catch {}
}
