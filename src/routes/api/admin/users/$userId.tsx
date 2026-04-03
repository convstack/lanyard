import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/users/$userId")({
	server: {
		handlers: {
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { userId: string };
			}) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser || !hasAdminReadAccess(authedUser.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { user } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [found] = await db
					.select()
					.from(user)
					.where(eq(user.id, params.userId))
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "User not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				const createdAtStr = found.createdAt
					? found.createdAt.toISOString().replace("T", " ").slice(0, 19)
					: "";

				return new Response(
					JSON.stringify({
						fields: [
							{ key: "name", label: "Name", value: found.name ?? "" },
							{ key: "email", label: "Email", value: found.email },
							{
								key: "emailVerified",
								label: "Email Verified",
								value: found.emailVerified,
							},
							{ key: "role", label: "Role", value: found.role ?? "user" },
							{ key: "banned", label: "Banned", value: found.banned ?? false },
							{ key: "createdAt", label: "Created", value: createdAtStr },
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

			PUT: async ({
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

				const body = await request.json();
				const { db } = await import("~/db");
				const { user } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const updates: Record<string, unknown> = { updatedAt: new Date() };
				if (typeof body.name === "string" && body.name)
					updates.name = body.name;
				if (typeof body.email === "string" && body.email)
					updates.email = body.email;
				if (typeof body.role === "string" && body.role)
					updates.role = body.role;

				await db.update(user).set(updates).where(eq(user.id, params.userId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
