import { createFileRoute } from "@tanstack/react-router";
import { getDepartmentBySlug } from "~/lib/department-utils";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute(
	"/api/departments/$slug/teams/$teamId/actions",
)({
	server: {
		handlers: {
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { slug: string; teamId: string };
			}) => {
				const user = await getAuthenticatedUser(request);
				if (!user) {
					return new Response(JSON.stringify({ actions: [] }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}

				const dept = await getDepartmentBySlug(params.slug, user.id, user.role);
				if (!dept || dept.role !== "admin") {
					return new Response(JSON.stringify({ actions: [] }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}

				return new Response(
					JSON.stringify({
						actions: [
							{
								label: "Edit Team",
								endpoint: "",
								method: "POST",
								link: `/${params.slug}/teams/${params.teamId}/edit`,
							},
							{
								label: "Delete Team",
								endpoint: `/api/departments/${params.slug}/teams/${params.teamId}/delete`,
								method: "POST",
								variant: "danger",
								confirm: "Delete this team and remove all members?",
							},
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
