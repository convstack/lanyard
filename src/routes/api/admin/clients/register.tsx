import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/clients/register")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const body = await request.json();
				const { name, redirectUrls, type } = body;

				if (!name || !redirectUrls) {
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
					redirectUrls: redirectUrls,
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
