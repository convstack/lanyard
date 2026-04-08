import { createFileRoute } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import { db } from "~/db";
import {
	organization,
	servicePermission,
	serviceRolePermission,
} from "~/db/schema";
import { clearPermissionCache } from "~/lib/permission-resolver";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/services/$serviceId/role-permissions",
)({
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
				if (!user || !hasAdminReadAccess(user.role)) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { eq } = await import("drizzle-orm");

				// Get all role-permission mappings for this service
				const mappings = await db
					.select({
						id: serviceRolePermission.id,
						orgName: organization.name,
						orgSlug: organization.slug,
						role: serviceRolePermission.role,
						permission: serviceRolePermission.permission,
						createdAt: serviceRolePermission.createdAt,
					})
					.from(serviceRolePermission)
					.innerJoin(
						organization,
						eq(serviceRolePermission.organizationId, organization.id),
					)
					.where(eq(serviceRolePermission.serviceId, params.serviceId));

				// Get declared permissions for context
				const declared = await db
					.select({
						permission: servicePermission.permission,
						description: servicePermission.description,
					})
					.from(servicePermission)
					.where(eq(servicePermission.serviceId, params.serviceId));

				return new Response(
					JSON.stringify({
						columns: [
							{ key: "orgName", label: "Department" },
							{ key: "role", label: "Role" },
							{ key: "permission", label: "Permission" },
						],
						rows: mappings.map((m) => ({
							id: m.id,
							orgName: m.orgName,
							role: m.role,
							permission: m.permission,
							createdAt: m.createdAt?.toISOString(),
						})),
						total: mappings.length,
						declaredPermissions: declared,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			},

			POST: async ({
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

				let body: {
					organizationId?: string;
					role?: string;
					permissions?: string[];
					permission?: string;
				};
				try {
					body = await request.json();
				} catch {
					return new Response(JSON.stringify({ error: "Invalid JSON" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Support both single permission and array of permissions
				const perms = body.permissions ??
					(body.permission ? [body.permission] : []);

				if (!body.organizationId || !body.role || perms.length === 0) {
					return new Response(
						JSON.stringify({
							error: "organizationId, role, and at least one permission are required",
						}),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				const ids: string[] = [];
				for (const perm of perms) {
					const id = nanoid();
					ids.push(id);
					await db.insert(serviceRolePermission).values({
						id,
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
						ids,
						redirect: `/services/${params.serviceId}/permissions`,
					}),
					{
						status: 201,
						headers: { "Content-Type": "application/json" },
					},
				);
			},
		},
	},
});
