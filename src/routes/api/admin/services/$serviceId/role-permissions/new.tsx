import { createFileRoute } from "@tanstack/react-router";
import { db } from "~/db";
import {
	organization,
	serviceCatalogEntry,
	servicePermission,
} from "~/db/schema";
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

				// Look up the parent service for breadcrumb labeling
				const [service] = await db
					.select({ name: serviceCatalogEntry.name })
					.from(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.id, params.serviceId))
					.limit(1);

				if (!service) {
					return new Response(
						JSON.stringify({
							error: `Service not found: ${params.serviceId}. The URL may contain an un-substituted route template — check the navigation link.`,
						}),
						{
							status: 404,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				// Get declared permissions for select options
				const perms = await db
					.select({ permission: servicePermission.permission })
					.from(servicePermission)
					.where(eq(servicePermission.serviceId, params.serviceId));

				// If the service hasn't declared any permissions in its manifest,
				// there's nothing to map. Return a clear error the form will
				// render instead of the opaque "organizationId, role, and at
				// least one permission are required" that the POST would throw.
				if (perms.length === 0) {
					return new Response(
						JSON.stringify({
							error: `"${service.name}" hasn't declared any permissions in its manifest. Add a \`permissions\` array to the service's UIManifest (e.g. \`permissions: ["${service.name.toLowerCase()}:admin"]\`) and re-register the service, then you can map those permissions to department roles here.`,
						}),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				// Get departments for select options
				const depts = await db
					.select({
						id: organization.id,
						name: organization.name,
					})
					.from(organization)
					.limit(100);

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
						{ label: "New Permission" },
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
						topBar,
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
