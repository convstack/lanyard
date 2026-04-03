import type { UIManifest } from "~/db/schema/service-catalog";

export const DEPARTMENTS_MANIFEST: UIManifest = {
	name: "Departments",
	icon: "building-2",
	version: "1.0.0",
	navigation: [{ label: "Departments", path: "/", icon: "building-2" }],
	widgets: [],
	pages: [
		{
			path: "/",
			title: "Departments",
			layout: "default",
			sections: [
				{
					type: "data-table",
					endpoint: "/api/departments",
					config: {
						rowLink: "/:slug",
					},
				},
			],
		},
		{
			path: "/:slug",
			title: "Department",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "detail",
					endpoint: "/api/departments/:slug",
					config: { title: "Department Info" },
				},
				{
					type: "action-bar",
					endpoint: "/api/departments/:slug/actions",
					config: {},
				},
				{
					type: "data-table",
					endpoint: "/api/departments/:slug/members",
					config: { title: "Members", readOnly: true },
				},
				{
					type: "data-table",
					endpoint: "/api/departments/:slug/teams",
					config: {
						title: "Teams",
						rowLink: "/:slug/teams/:id/members",
						readOnly: true,
					},
				},
			],
		},
		{
			path: "/:slug/edit",
			title: "Edit Department",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/departments/:slug",
					config: {
						fields: [
							{ key: "name", label: "Department Name", type: "text" },
							{ key: "metadata", label: "Description", type: "textarea" },
						],
						submitLabel: "Save Changes",
						method: "PUT",
					},
				},
			],
		},
		{
			path: "/:slug/members",
			title: "Members",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "data-table",
					endpoint: "/api/departments/:slug/members",
					config: {
						title: "Department Members",
						createLink: "/:slug/members/add",
						createLabel: "Add Member",
					},
				},
			],
		},
		{
			path: "/:slug/members/add",
			title: "Add Member",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/departments/:slug/members",
					config: {
						fields: [
							{
								key: "userId",
								label: "User",
								type: "search",
								required: true,
								placeholder: "Search by name or email...",
								searchEndpoint: "/api/departments/users-search",
								searchResultLabel: "name",
								searchResultValue: "id",
							},
							{
								key: "role",
								label: "Role",
								type: "select",
								options: [
									{ label: "Member", value: "member" },
									{ label: "Admin", value: "admin" },
								],
							},
						],
						submitLabel: "Add Member",
					},
				},
			],
		},
		{
			path: "/:slug/teams",
			title: "Teams",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "data-table",
					endpoint: "/api/departments/:slug/teams",
					config: {
						title: "Teams",
						rowLink: "/:slug/teams/:id/members",
						createLink: "/:slug/teams/create",
						createLabel: "Create Team",
					},
				},
			],
		},
		{
			path: "/:slug/teams/create",
			title: "Create Team",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/departments/:slug/teams",
					config: {
						fields: [
							{
								key: "name",
								label: "Team Name",
								type: "text",
								required: true,
							},
							{
								key: "description",
								label: "Description",
								type: "textarea",
							},
						],
					},
				},
			],
		},
		{
			path: "/:slug/teams/:teamId/members",
			title: "Team",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "detail",
					endpoint: "/api/departments/:slug/teams/:teamId",
					config: { title: "Team Info" },
				},
				{
					type: "action-bar",
					endpoint: "/api/departments/:slug/teams/:teamId/actions",
					config: {},
				},
				{
					type: "data-table",
					endpoint: "/api/departments/:slug/teams/:teamId/members",
					config: {
						title: "Members",
						createLink: "/:slug/teams/:teamId/members/add",
						createLabel: "Add Member",
					},
				},
			],
		},
		{
			path: "/:slug/teams/:teamId/edit",
			title: "Edit Team",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/departments/:slug/teams/:teamId",
					config: {
						fields: [
							{ key: "name", label: "Team Name", type: "text" },
							{ key: "description", label: "Description", type: "textarea" },
						],
						submitLabel: "Save Changes",
						method: "PUT",
					},
				},
			],
		},
		{
			path: "/:slug/teams/:teamId/members/add",
			title: "Add Team Member",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/departments/:slug/teams/:teamId/members",
					config: {
						fields: [
							{
								key: "userId",
								label: "User",
								type: "search",
								required: true,
								placeholder: "Search by name or email...",
								searchEndpoint: "/api/departments/users-search",
								searchResultLabel: "name",
								searchResultValue: "id",
							},
						],
						submitLabel: "Add to Team",
					},
				},
			],
		},
	],
	permissions: [],
};
