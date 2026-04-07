import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/lib/auth";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/password")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Change current user password
			 * auth: user
			 * body:
			 *   currentPassword: string (required) - Current password
			 *   newPassword: string (required) - New password
			 * response: 200
			 *   success: boolean
			 * error: 400 Password change failed
			 * error: 401 Unauthorized
			 */
			POST: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const body = await request.json();
				try {
					await auth.api.changePassword({
						body: {
							currentPassword: body.currentPassword,
							newPassword: body.newPassword,
						},
						headers: request.headers,
					});
					return new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch {
					return new Response(
						JSON.stringify({
							error: "Password change failed. Check your current password.",
						}),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
			},
		},
	},
});
