import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/clients/register")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Register a new OAuth client
			 * auth: admin
			 * body:
			 *   name: string (required) - Client name
			 *   redirectUris: string (required) - Redirect URLs
			 *   type: string - Client type (default: confidential)
			 * response: 201
			 *   success: boolean
			 *   clientId: string
			 *   clientSecret: string
			 *   message: string
			 *   redirect: string
			 * error: 400 Name and redirect URLs are required
			 * error: 401 Unauthorized
			 */
			POST: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const body = await request.json();
				const { name, redirectUris, type } = body;

				if (!name || !redirectUris) {
					return new Response(
						JSON.stringify({ error: "Name and redirect URLs are required" }),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}

				const { nanoid } = await import("nanoid");
				const { db } = await import("~/db");
				const { oauthApplication } = await import("~/db/schema");

				const clientId = nanoid();
				const clientSecret = nanoid(32);

				await db.insert(oauthApplication).values({
					id: nanoid(),
					name,
					clientId,
					clientSecret,
					redirectUris: redirectUris.split(",").map((u: string) => u.trim()),
					type: type || "confidential",
					disabled: false,
					userId: user.id,
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				return new Response(
					JSON.stringify({
						success: true,
						clientId,
						clientSecret,
						message: "Save the client secret — it will not be shown again.",
						redirect: "/lanyard-admin/clients",
					}),
					{ status: 201, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
