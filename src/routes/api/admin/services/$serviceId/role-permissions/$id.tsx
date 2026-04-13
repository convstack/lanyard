import { createFileRoute } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import { db } from "~/db";
import {
	organization,
	serviceCatalogEntry,
	servicePermission,
	serviceRolePermission,
} from "~/db/schema";
import { clearPermissionCache } from "~/lib/permission-resolver";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/services/$serviceId/role-permissions/$id",
)({
	server: {
		handlers: {
			/**
			 * Returns current mapping values as dynamic form fields.
			 * Loads all permissions for the same (org, role) pair
			 * so checkboxes show the full picture.
			 */
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { serviceId: string; id: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || !hasAdminReadAccess(user.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { eq, and } = await import("drizzle-orm");

				const [mapping] = await db
					.select()
					.from(serviceRolePermission)
					.where(eq(serviceRolePermission.id, params.id))
					.limit(1);

				if (!mapping) {
					return new Response(JSON.stringify({ error: "Not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Get all permissions for this (service, org, role) pair
				const siblingMappings = await db
					.select({ permission: serviceRolePermission.permission })
					.from(serviceRolePermission)
					.where(
						and(
							eq(serviceRolePermission.serviceId, params.serviceId),
							eq(serviceRolePermission.organizationId, mapping.organizationId),
							eq(serviceRolePermission.role, mapping.role),
						),
					);
				const currentPerms = siblingMappings.map((m) => m.permission);

				// Get departments and declared permissions for options
				const depts = await db
					.select({ id: organization.id, name: organization.name })
					.from(organization)
					.limit(100);

				const perms = await db
					.select({ permission: servicePermission.permission })
					.from(servicePermission)
					.where(eq(servicePermission.serviceId, params.serviceId));

				// Parent service lookup for breadcrumb
				const [service] = await db
					.select({ name: serviceCatalogEntry.name })
					.from(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.id, params.serviceId))
					.limit(1);

				const topBar = {
					breadcrumbs: [
						{ label: "Services", href: "/services" },
						{
							label: service?.name ?? "Service",
							href: `/services/${params.serviceId}`,
						},
						{
							label: "Permissions",
							href: `/services/${params.serviceId}/role-permissions`,
						},
						{ label: "Edit Permission" },
					],
				};

				return new Response(
					JSON.stringify({
						fields: [
							{
								key: "organizationId",
								label: "Department",
								type: "select",
								required: true,
								options: depts.map((d) => ({
									label: d.name,
									value: d.id,
								})),
								value: mapping.organizationId,
							},
							{
								key: "role",
								label: "Role",
								type: "select",
								required: true,
								options: [
									{ label: "Member", value: "member" },
									{ label: "Admin", value: "admin" },
								],
								value: mapping.role,
							},
							{
								key: "permissions",
								label: "Permissions",
								type: "checkboxes",
								required: true,
								options: perms.map((p) => ({
									label: p.permission,
									value: p.permission,
								})),
								value: currentPerms,
							},
						],
						topBar,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			},

			/**
			 * Replaces all permissions for this mapping's (org, role) pair
			 * with the submitted set.
			 */
			PUT: async ({
				request,
				params,
			}: {
				request: Request;
				params: { serviceId: string; id: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				let body: {
					organizationId?: string;
					role?: string;
					permissions?: string[];
				};
				try {
					body = await request.json();
				} catch {
					return new Response(JSON.stringify({ error: "Invalid JSON" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}

				if (!body.organizationId || !body.role || !body.permissions?.length) {
					return new Response(
						JSON.stringify({
							error:
								"organizationId, role, and at least one permission are required",
						}),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				const { eq, and } = await import("drizzle-orm");

				// Delete all existing mappings for this (service, org, role) pair
				await db
					.delete(serviceRolePermission)
					.where(
						and(
							eq(serviceRolePermission.serviceId, params.serviceId),
							eq(serviceRolePermission.organizationId, body.organizationId),
							eq(serviceRolePermission.role, body.role),
						),
					);

				// Insert new mappings
				for (const perm of body.permissions) {
					await db.insert(serviceRolePermission).values({
						id: nanoid(),
						serviceId: params.serviceId,
						organizationId: body.organizationId,
						role: body.role,
						permission: perm,
						createdAt: new Date(),
					});
				}

				clearPermissionCache();

				return new Response(
					JSON.stringify({
						success: true,
						redirect: `/services/${params.serviceId}/permissions`,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			},

			DELETE: async ({
				request,
				params,
			}: {
				request: Request;
				params: { serviceId: string; id: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { eq } = await import("drizzle-orm");

				await db
					.delete(serviceRolePermission)
					.where(eq(serviceRolePermission.id, params.id));

				clearPermissionCache();

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
