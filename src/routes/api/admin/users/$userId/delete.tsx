import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/users/$userId/delete")({
	server: {
		handlers: {
			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { userId: string };
			}) => {
				const admin = await getAuthenticatedUser(request);
				if (!admin || admin.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Prevent self-deletion
				if (admin.id === params.userId) {
					return new Response(
						JSON.stringify({ error: "You cannot delete your own account" }),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}

				const { db } = await import("~/db");
				const {
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

				// Verify user exists
				const [found] = await db
					.select({ id: user.id, image: user.image })
					.from(user)
					.where(eq(user.id, params.userId))
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "User not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Delete S3 avatar
				if (found.image) {
					try {
						const { deleteFile } = await import("~/lib/s3");
						await deleteFile(found.image);
					} catch {}
				}

				// Purge all user data
				try {
					await db
						.delete(sessionTable)
						.where(eq(sessionTable.userId, params.userId));
				} catch {}
				try {
					await db
						.delete(oauthAccessToken)
						.where(eq(oauthAccessToken.userId, params.userId));
				} catch {}
				try {
					await db
						.delete(oauthConsent)
						.where(eq(oauthConsent.userId, params.userId));
				} catch {}
				try {
					await db.delete(passkey).where(eq(passkey.userId, params.userId));
				} catch {}
				try {
					await db.delete(twoFactor).where(eq(twoFactor.userId, params.userId));
				} catch {}
				try {
					await db
						.delete(teamMember)
						.where(eq(teamMember.userId, params.userId));
				} catch {}
				try {
					await db.delete(member).where(eq(member.userId, params.userId));
				} catch {}
				try {
					await db.delete(account).where(eq(account.userId, params.userId));
				} catch {}
				await db.delete(user).where(eq(user.id, params.userId));

				// Propagate logout
				try {
					const { propagateLogout, revokeUserTokens } = await import(
						"~/server/services/logout-propagation"
					);
					await revokeUserTokens(params.userId);
					await propagateLogout(params.userId);
				} catch {}

				return new Response(
					JSON.stringify({ success: true, redirect: "/lanyard-admin/users" }),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
