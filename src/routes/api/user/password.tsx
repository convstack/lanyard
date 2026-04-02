import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/lib/auth";

export const Route = createFileRoute("/api/user/password")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) {
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
