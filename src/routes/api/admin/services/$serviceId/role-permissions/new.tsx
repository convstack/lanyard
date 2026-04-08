import { createFileRoute } from "@tanstack/react-router";
import { db } from "~/db";
import { organization, servicePermission } from "~/db/schema";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/services/$serviceId/role-permissions/new",
)({
	server: {
		handlers: {
			/**
			 * Returns dynamic form field definitions for creating a
			 * role-permission mapping. The permission field is a select
			 * populated from the service's declared permissions.
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

				const { eq } = await import("drizzle-orm");

				// Get declared permissions for select options
				const perms = await db
					.select({ permission: servicePermission.permission })
					.from(servicePermission)
					.where(eq(servicePermission.serviceId, params.serviceId));

				// Get departments for select options
				const depts = await db
					.select({
						id: organization.id,
						name: organization.name,
					})
					.from(organization)
					.limit(100);

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
								value: "",
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
								value: "",
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
								value: "",
							},
						],
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			},
		},
	},
});
