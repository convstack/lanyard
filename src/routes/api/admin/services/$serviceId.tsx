import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/services/$serviceId")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Get service details (admin view)
			 * auth: admin
			 * response: 200
			 *   fields: array
			 * error: 401 Unauthorized
			 * error: 404 Service not found
			 */
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { serviceId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || !hasAdminReadAccess(user.role)) {
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
							{
								key: "visibility",
								label: "Visibility",
								value: found.visibility ?? "all",
							},
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
							{
								key: "requiredOrganizationId",
								label: "Restricted to Department",
								value: found.requiredOrganizationId ?? "All (no restriction)",
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

			/** @openapi
			 * summary: Update a service (admin)
			 * auth: admin
			 * body:
			 *   name: string - Service name
			 *   description: string - Description
			 *   baseUrl: string - Base URL
			 *   healthCheckPath: string - Health check path
			 *   version: string - Version
			 *   type: string - Service type
			 *   visibility: string - Visibility level
			 * response: 200
			 *   success: boolean
			 * error: 401 Unauthorized
			 */
			PUT: async ({
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

				const body = await request.json();
				const { db } = await import("~/db");
				const { serviceCatalogEntry } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const updates: Record<string, unknown> = {
					updatedAt: new Date(),
				};
				if (typeof body.name === "string" && body.name)
					updates.name = body.name;
				if (typeof body.description === "string")
					updates.description = body.description || null;
				if (typeof body.baseUrl === "string" && body.baseUrl)
					updates.baseUrl = body.baseUrl;
				if (typeof body.healthCheckPath === "string" && body.healthCheckPath)
					updates.healthCheckPath = body.healthCheckPath;
				if (typeof body.version === "string")
					updates.version = body.version || null;
				if (typeof body.type === "string" && body.type)
					updates.type = body.type;
				if (typeof body.visibility === "string" && body.visibility)
					updates.visibility = body.visibility;

				await db
					.update(serviceCatalogEntry)
					.set(updates)
					.where(eq(serviceCatalogEntry.id, params.serviceId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
