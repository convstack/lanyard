import { createFileRoute } from "@tanstack/react-router";
import { getDepartmentBySlug } from "~/lib/department-utils";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/departments/$slug")({
	server: {
		handlers: {
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { slug: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const dept = await getDepartmentBySlug(params.slug, user.id, user.role);
				if (!dept) {
					return new Response(
						JSON.stringify({ error: "Department not found" }),
						{ status: 404, headers: { "Content-Type": "application/json" } },
					);
				}

				return new Response(
					JSON.stringify({
						fields: [
							{ key: "name", label: "Name", value: dept.name },
							{
								key: "metadata",
								label: "Description",
								value: dept.metadata ?? "",
							},
							{ key: "role", label: "Your Role", value: dept.role },
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},

			PUT: async ({
				request,
				params,
			}: {
				request: Request;
				params: { slug: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const dept = await getDepartmentBySlug(params.slug, user.id, user.role);
				if (!dept || dept.role !== "admin") {
					return new Response(
						JSON.stringify({ error: "Admin access required" }),
						{ status: 403, headers: { "Content-Type": "application/json" } },
					);
				}

				const body = await request.json();
				const { db } = await import("~/db");
				const { organization } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const updates: Record<string, unknown> = {};
				if (typeof body.name === "string" && body.name)
					updates.name = body.name;
				if (typeof body.metadata === "string")
					updates.metadata = body.metadata || null;

				if (Object.keys(updates).length > 0) {
					await db
						.update(organization)
						.set(updates)
						.where(eq(organization.id, dept.departmentId));
				}

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
