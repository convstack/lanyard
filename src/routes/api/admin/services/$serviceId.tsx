import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/services/$serviceId")({
	server: {
		handlers: {
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { serviceId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { serviceCatalogEntry } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [found] = await db
					.select()
					.from(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.id, params.serviceId))
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "Service not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				const createdAtStr = found.createdAt
					? found.createdAt.toISOString().replace("T", " ").slice(0, 16)
					: "";

				return new Response(
					JSON.stringify({
						fields: [
							{ key: "name", label: "Name", value: found.name },
							{ key: "slug", label: "Slug", value: found.slug },
							{ key: "type", label: "Type", value: found.type },
							{
								key: "description",
								label: "Description",
								value: found.description ?? "",
							},
							{ key: "baseUrl", label: "Base URL", value: found.baseUrl },
							{
								key: "healthCheckPath",
								label: "Health Check Path",
								value: found.healthCheckPath,
							},
							{ key: "status", label: "Status", value: found.status },
							{
								key: "disabled",
								label: "Disabled",
								value: found.disabled,
							},
							{ key: "version", label: "Version", value: found.version ?? "" },
							{
								key: "apiKeyPrefix",
								label: "API Key Prefix",
								value: found.apiKeyPrefix,
							},
							{ key: "createdAt", label: "Created", value: createdAtStr },
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
