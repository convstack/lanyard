import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/services/$serviceId/actions")({
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

				const { db } = await import("~/db");
				const { serviceCatalogEntry } = await import("~/db/schema");
				const { eq } = await import("drizzle-orm");

				const [found] = await db
					.select({
						id: serviceCatalogEntry.id,
						disabled: serviceCatalogEntry.disabled,
					})
					.from(serviceCatalogEntry)
					.where(eq(serviceCatalogEntry.id, params.serviceId))
					.limit(1);

				if (!found) {
					return new Response(JSON.stringify({ error: "Service not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				const actions = [
					{
						label: "Edit Service",
						endpoint: "",
						method: "POST",
						link: `/services/${params.serviceId}/edit`,
					},
					{
						label: "Regenerate API Key",
						endpoint: `/api/admin/services/${params.serviceId}/regenerate-key`,
						method: "POST",
						confirm:
							"Regenerate this service's API key? The old key will stop working immediately.",
					},
					{
						label: found.disabled ? "Enable Service" : "Disable Service",
						endpoint: `/api/admin/services/${params.serviceId}/toggle`,
						method: "POST",
						variant: found.disabled ? "default" : "danger",
					},
					{
						label: "Delete Service",
						endpoint: `/api/admin/services/${params.serviceId}/delete`,
						method: "POST",
						variant: "danger",
						confirm:
							"Are you sure you want to delete this service? This action cannot be undone.",
						redirect: "/services",
					},
				];

				return new Response(JSON.stringify({ actions }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
