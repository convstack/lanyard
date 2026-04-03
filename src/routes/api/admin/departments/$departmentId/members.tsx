import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/departments/$departmentId/members",
)({
	server: {
		handlers: {
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { departmentId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || !hasAdminReadAccess(user.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { member, user: userTable } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const members = await db
					.select({
						id: member.id,
						name: userTable.name,
						email: userTable.email,
						role: member.role,
					})
					.from(member)
					.innerJoin(userTable, eq(member.userId, userTable.id))
					.where(eq(member.organizationId, params.departmentId));

				const rows = members.map((m) => ({
					id: m.id,
					name: m.name ?? "",
					email: m.email,
					role: m.role,
				}));

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "name", label: "Name" },
							{ key: "email", label: "Email" },
							{ key: "role", label: "Role" },
						],
						rows,
						rowActions: [
							{
								label: "Remove",
								endpoint: `/api/admin/departments/${params.departmentId}/members/:id/remove`,
								method: "POST",
								variant: "danger",
								confirm: "Remove this member from the department?",
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

			POST: async ({
				request,
				params,
			}: {
				request: Request;
				params: { departmentId: string };
			}) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser || authedUser.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const body = await request.json();
				const { userId, email, role } = body as {
					userId?: string;
					email?: string;
					role?: string;
				};

				const { db } = await import("~/db");
				const { member, user: userTable } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");
				const { nanoid } = await import("nanoid");

				let targetUserId = userId;

				if (!targetUserId && email) {
					const [found] = await db
						.select({ id: userTable.id })
						.from(userTable)
						.where(eq(userTable.email, email))
						.limit(1);
					if (!found) {
						return new Response(JSON.stringify({ error: "User not found" }), {
							status: 404,
							headers: { "Content-Type": "application/json" },
						});
					}
					targetUserId = found.id;
				}

				if (!targetUserId) {
					return new Response(
						JSON.stringify({ error: "User ID or email is required" }),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				await db.insert(member).values({
					id: nanoid(),
					organizationId: params.departmentId,
					userId: targetUserId,
					role: role ?? "member",
					createdAt: new Date(),
				});

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
