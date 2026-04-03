import { createFileRoute } from "@tanstack/react-router";
import {
	getAuthenticatedUser,
	hasAdminReadAccess,
} from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/admin/departments/$departmentId/actions",
)({
	server: {
		handlers: {
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

				const actions = [
					{
						label: "Edit Department",
						endpoint: "",
						method: "POST",
						link: `/departments/${params.departmentId}/edit`,
					},
					{
						label: "Delete Department",
						endpoint: `/api/admin/departments/${params.departmentId}/delete`,
						method: "POST",
						variant: "danger",
						confirm:
							"Are you sure you want to delete this department? This action cannot be undone.",
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
