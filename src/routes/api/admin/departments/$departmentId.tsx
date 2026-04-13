import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/departments/$departmentId")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Get department details by ID (admin)
			 * auth: admin
			 * response: 200
			 *   fields: array
			 * error: 401 Unauthorized
			 * error: 404 Department not found
			 */
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { departmentId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || !hasAdminReadAccess(user.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { db } = await import("~/db");
				const { organization } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [found] = await db
					.select()
					.from(organization)
					.where(eq(organization.id, params.departmentId))
					.limit(1);

				if (!found) {
					return new Response(
						JSON.stringify({ error: "Department not found" }),
						{ status: 404, headers: { "Content-Type": "application/json" } },
					);
				}

				const createdAtStr = found.createdAt
					? found.createdAt.toISOString().replace("T", " ").slice(0, 16)
					: "";

				const topBar = {
					breadcrumbs: [
						{ label: "Departments", href: "/departments" },
						{ label: found.name },
					],
				};

				return new Response(
					JSON.stringify({
						fields: [
							{ key: "name", label: "Name", value: found.name },
							{ key: "slug", label: "Slug", value: found.slug },
							{
								key: "metadata",
								label: "Description",
								value: found.metadata ?? "",
							},
							{ key: "createdAt", label: "Created", value: createdAtStr },
						],
						topBar,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

			/** @openapi
			 * summary: Update a department (admin)
			 * auth: admin
			 * body:
			 *   name: string - Department name
			 *   slug: string - URL slug
			 *   logo: string - Logo URL
			 *   metadata: string - Description
			 * response: 200
			 *   success: boolean
			 * error: 400 No fields to update
			 * error: 401 Unauthorized
			 */
			PUT: async ({
				request,
				params,
			}: {
				request: Request;
				params: { departmentId: string };
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
				const { organization } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const updates: Record<string, unknown> = {};
				if (typeof body.name === "string" && body.name)
					updates.name = body.name;
				if (typeof body.slug === "string" && body.slug)
					updates.slug = body.slug;
				if (typeof body.logo === "string") updates.logo = body.logo || null;
				if (typeof body.metadata === "string")
					updates.metadata = body.metadata || null;

				if (Object.keys(updates).length === 0) {
					return new Response(
						JSON.stringify({ error: "No fields to update" }),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}

				await db
					.update(organization)
					.set(updates)
					.where(eq(organization.id, params.departmentId));

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
