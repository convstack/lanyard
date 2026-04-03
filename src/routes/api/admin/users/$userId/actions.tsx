import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/users/$userId/actions")({
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
				if (!authedUser || authedUser.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { user } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [found] = await db
					.select({
						banned: user.banned,
						role: user.role,
						emailVerified: user.emailVerified,
					})
					.from(user)
					.where(eq(user.id, params.userId))
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "User not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				const actions: Array<{
					label: string;
					endpoint: string;
					method: string;
					variant?: string;
					confirm?: string;
					link?: string;
				}> = [];

				// Edit action (navigates to edit page)
				actions.push({
					label: "Edit User",
					endpoint: "",
					method: "POST",
					link: `/users/${params.userId}/edit`,
				});

				if (!found.emailVerified) {
					actions.push({
						label: "Verify Email",
						endpoint: `/api/admin/users/${params.userId}/verify-email`,
						method: "POST",
					});
				}

				if (found.banned) {
					actions.push({
						label: "Unban User",
						endpoint: `/api/admin/users/${params.userId}/unban`,
						method: "POST",
					});
				} else {
					actions.push({
						label: "Ban User",
						endpoint: `/api/admin/users/${params.userId}/ban`,
						method: "POST",
						variant: "danger",
						confirm: "Are you sure you want to ban this user?",
					});
				}

				if (found.role !== "staff") {
					actions.push({
						label: "Set as Staff",
						endpoint: `/api/admin/users/${params.userId}/set-role?role=staff`,
						method: "POST",
						confirm: "Set this user as staff?",
					});
				}
				if (found.role !== "admin") {
					actions.push({
						label: "Promote to Admin",
						endpoint: `/api/admin/users/${params.userId}/set-role?role=admin`,
						method: "POST",
						confirm: "Grant admin privileges to this user?",
					});
				}
				if (found.role !== "user") {
					actions.push({
						label: "Demote to User",
						endpoint: `/api/admin/users/${params.userId}/set-role?role=user`,
						method: "POST",
						variant: "danger",
						confirm: "Remove all privileges from this user?",
					});
				}

				return new Response(JSON.stringify({ actions }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
