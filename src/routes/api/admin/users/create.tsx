import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/users/create")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const admin = await getAuthenticatedUser(request);
				if (!admin || admin.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const body = await request.json();
				const { name, email, password, role } = body;

				if (!name || !email || !password) {
					return new Response(
						JSON.stringify({
							error: "Name, email, and password are required",
						}),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}

				try {
					const { auth } = await import("~/lib/auth");
					const result = await auth.api.signUpEmail({
						body: { email, password, name },
					});

					if (!result?.user) {
						return new Response(
							JSON.stringify({ error: "Failed to create user" }),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					// Set role and verify email if specified
					const { db } = await import("~/db");
					const { user } = await import("~/db/schema");
					const { eq } = await import("drizzle-orm");

					await db
						.update(user)
						.set({
							role: role || "user",
							emailVerified: true,
						})
						.where(eq(user.id, result.user.id));

					return new Response(
						JSON.stringify({
							success: true,
							userId: result.user.id,
						}),
						{ status: 201, headers: { "Content-Type": "application/json" } },
					);
				} catch (err: unknown) {
					const msg = err instanceof Error ? err.message : "Creation failed";
					return new Response(JSON.stringify({ error: msg }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}
			},
		},
	},
});
