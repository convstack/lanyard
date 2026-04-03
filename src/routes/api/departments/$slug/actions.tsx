import { createFileRoute } from "@tanstack/react-router";
import { getDepartmentBySlug } from "~/lib/department-utils";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/departments/$slug/actions")({
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
					return new Response(JSON.stringify({ actions: [] }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}

				const isAdmin = dept.role === "admin";
				const isIdpAdmin = user.role === "admin";

				const actions: Array<{
					label: string;
					endpoint: string;
					method: string;
					variant?: string;
					confirm?: string;
					link?: string;
					redirect?: string;
				}> = [];

				if (isAdmin) {
					actions.push({
						label: "Edit Department",
						endpoint: "",
						method: "POST",
						link: `/${params.slug}/edit`,
					});
					actions.push({
						label: "Manage Members",
						endpoint: "",
						method: "POST",
						link: `/${params.slug}/members`,
					});
					actions.push({
						label: "Manage Teams",
						endpoint: "",
						method: "POST",
						link: `/${params.slug}/teams`,
					});
				}

				if (isIdpAdmin) {
					actions.push({
						label: "Delete Department",
						endpoint: `/api/admin/departments/${dept.departmentId}/delete`,
						method: "POST",
						variant: "danger",
						confirm:
							"Delete this department? All members and teams will be removed.",
						redirect: "/",
					});
				}

				return new Response(JSON.stringify({ actions }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
