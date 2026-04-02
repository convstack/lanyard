import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/user/profile")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				return new Response(
					JSON.stringify({
						fields: [
							{
								key: "name",
								label: "Display Name",
								value: authedUser.name ?? "—",
							},
							{
								key: "email",
								label: "Email",
								value: authedUser.email ?? "—",
							},
							{
								key: "image",
								label: "Avatar URL",
								value: authedUser.image ?? "—",
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
			PUT: async ({ request }: { request: Request }) => {
				const authedUser = await getAuthenticatedUser(request);
				if (!authedUser) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const body = await request.json();
				const { db } = await import("~/db");
				const { user } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const updates: Record<string, string> = {};
				if (typeof body.name === "string") updates.name = body.name;
				if (typeof body.image === "string") updates.image = body.image;

				if (Object.keys(updates).length > 0) {
					await db
						.update(user)
						.set({ ...updates, updatedAt: new Date() })
						.where(eq(user.id, authedUser.id));
				}

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
