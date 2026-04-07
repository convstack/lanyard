import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/departments/create")({
	server: {
		handlers: {
			/** @openapi
			 * summary: Create a new department
			 * auth: admin
			 * body:
			 *   name: string (required) - Department name
			 *   slug: string (required) - URL slug
			 *   metadata: string - Description
			 *   private: boolean - Whether department is private
			 * response: 201
			 *   success: boolean
			 *   departmentId: string
			 *   redirect: string
			 * error: 400 Name and slug are required
			 * error: 401 Unauthorized
			 * error: 409 Slug already exists
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
				const { name, slug, metadata } = body;

				if (!name || !slug) {
					return new Response(
						JSON.stringify({ error: "Name and slug are required" }),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}

				const { db } = await import("~/db");
				const { organization } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [existing] = await db
					.select({ id: organization.id })
					.from(organization)
					.where(eq(organization.slug, slug))
					.limit(1);

				if (existing) {
					return new Response(
						JSON.stringify({
							error: "A department with that slug already exists",
						}),
						{ status: 409, headers: { "Content-Type": "application/json" } },
					);
				}

				const { nanoid } = await import("nanoid");
				const id = nanoid();

				await db.insert(organization).values({
					id,
					name,
					slug,
					metadata: metadata || null,
					private: body.private === true || body.private === "true",
					createdAt: new Date(),
				});

				return new Response(
					JSON.stringify({
						success: true,
						departmentId: id,
						redirect: `/departments/${slug}`,
					}),
					{ status: 201, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
