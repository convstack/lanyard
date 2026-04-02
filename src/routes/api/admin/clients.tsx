import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/lib/auth";

export const Route = createFileRoute("/api/admin/clients")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session || session.user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { oauthApplication } = await import("~/db/schema");
				const { desc, count } = await import("drizzle-orm");

				const [clients, [{ total }]] = await Promise.all([
					db
						.select({
							id: oauthApplication.id,
							name: oauthApplication.name,
							clientId: oauthApplication.clientId,
							type: oauthApplication.type,
							disabled: oauthApplication.disabled,
						})
						.from(oauthApplication)
						.orderBy(desc(oauthApplication.createdAt))
						.limit(200),
					db.select({ total: count() }).from(oauthApplication),
				]);

				const rows = clients.map((c) => ({
					id: c.id,
					name: c.name ?? "",
					clientId: c.clientId,
					type: c.type,
					status: c.disabled ? "Disabled" : "Active",
				}));

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "name", label: "Name" },
							{ key: "clientId", label: "Client ID" },
							{ key: "type", label: "Type" },
							{ key: "status", label: "Status" },
						],
						rows,
						total,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
