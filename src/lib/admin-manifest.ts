import type { UIManifest } from "~/db/schema/service-catalog";

export const LANYARD_ADMIN_MANIFEST: UIManifest = {
	name: "Lanyard Admin",
	icon: "shield",
	version: "1.0.0",
	navigation: [
		{ label: "Overview", path: "/", icon: "layout-dashboard" },
		{ label: "Users", path: "/users", icon: "users" },
		{ label: "Departments", path: "/departments", icon: "building-2" },
		{ label: "OIDC Clients", path: "/clients", icon: "key-round" },
		{ label: "Services", path: "/services", icon: "box" },
		{ label: "Branding", path: "/branding", icon: "palette" },
		{ label: "Settings", path: "/settings", icon: "settings" },
	],
	widgets: [
		{
			id: "system-overview",
			type: "stat",
			label: "System Overview",
			endpoint: "/api/admin/stats",
			size: "full",
		},
	],
	pages: [
		{
			path: "/",
			title: "Administration Overview",
			layout: "default",
			sections: [
				{ type: "widget-grid", endpoint: "/api/admin/stats", config: {} },
				{
					type: "data-table",
					endpoint: "/api/admin/services",
					config: {
						title: "Connected Services",
						rowLink: "/services/:id",
					},
				},
			],
		},
		{
			path: "/users",
			title: "User Management",
			layout: "default",
			sections: [
				{
					type: "data-table",
					endpoint: "/api/admin/users",
					config: {
						rowLink: "/users/:id",
						createLink: "/users/new",
						createLabel: "Create User",
					},
				},
			],
		},
		{
			path: "/users/new",
			title: "Create User",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/admin/users/create",
					config: {
						title: "Create a New User",
						fields: [
							{
								key: "name",
								label: "Display Name",
								type: "text",
								required: true,
							},
							{
								key: "email",
								label: "Email",
								type: "email",
								required: true,
							},
							{
								key: "password",
								label: "Password",
								type: "password",
								required: true,
							},
							{
								key: "role",
								label: "Role",
								type: "select",
								options: [
									{ label: "User", value: "user" },
									{ label: "Admin", value: "admin" },
								],
							},
						],
						submitLabel: "Create User",
					},
				},
			],
		},
		{
			path: "/users/:userId",
			title: "User Detail",
			layout: "default",
			sections: [
				{
					type: "detail",
					endpoint: "/api/admin/users/:userId",
					config: { title: "Account Information" },
				},
				{
					type: "action-bar",
					endpoint: "/api/admin/users/:userId/actions",
					config: {},
				},
			],
		},
		{
			path: "/users/:userId/edit",
			title: "Edit User",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/admin/users/:userId",
					config: {
						fields: [
							{ key: "name", label: "Display Name", type: "text" },
							{ key: "email", label: "Email", type: "email" },
							{
								key: "role",
								label: "Role",
								type: "select",
								options: [
									{ label: "User", value: "user" },
									{ label: "Admin", value: "admin" },
								],
							},
						],
						submitLabel: "Save Changes",
						method: "PUT",
					},
				},
			],
		},
		{
			path: "/departments",
			title: "Departments",
			layout: "default",
			sections: [
				{
					type: "data-table",
					endpoint: "/api/admin/departments",
					config: {
						rowLink: "/departments/:id",
						createLink: "/departments/new",
						createLabel: "Create Department",
					},
				},
			],
		},
		{
			path: "/departments/new",
			title: "Create Department",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/admin/departments/create",
					config: {
						fields: [
							{ key: "name", label: "Department Name", type: "text", required: true },
							{ key: "slug", label: "Slug", type: "text", required: true, placeholder: "security" },
						],
						submitLabel: "Create Department",
					},
				},
			],
		},
		{
			path: "/departments/:departmentId",
			title: "Department Detail",
			layout: "default",
			sections: [
				{
					type: "detail",
					endpoint: "/api/admin/departments/:departmentId",
					config: { title: "Department Info" },
				},
				{
					type: "action-bar",
					endpoint: "/api/admin/departments/:departmentId/actions",
					config: {},
				},
				{
					type: "data-table",
					endpoint: "/api/admin/departments/:departmentId/members",
					config: {
						title: "Members",
						createLink: "/departments/:departmentId/members/add",
						createLabel: "Add Member",
					},
				},
				{
					type: "data-table",
					endpoint: "/api/admin/departments/:departmentId/teams",
					config: {
						title: "Teams",
						createLink: "/departments/:departmentId/teams/create",
						createLabel: "Create Team",
						rowLink: "/departments/:departmentId/teams/:id/members",
					},
				},
			],
		},
		{
			path: "/departments/:departmentId/edit",
			title: "Edit Department",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/admin/departments/:departmentId",
					config: {
						fields: [
							{ key: "name", label: "Department Name", type: "text" },
							{ key: "slug", label: "Slug", type: "text" },
						],
						submitLabel: "Save Changes",
						method: "PUT",
					},
				},
			],
		},
		{
			path: "/departments/:departmentId/members/add",
			title: "Add Member",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/admin/departments/:departmentId/members",
					config: {
						fields: [
							{ key: "email", label: "User Email", type: "email", required: true },
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
			path: "/departments/:departmentId/teams/create",
			title: "Create Team",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/admin/departments/:departmentId/teams",
					config: {
						fields: [
							{ key: "name", label: "Team Name", type: "text", required: true },
						],
						submitLabel: "Create Team",
					},
				},
			],
		},
		{
			path: "/departments/:departmentId/teams/:teamId/members",
			title: "Team Members",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "data-table",
					endpoint: "/api/admin/departments/:departmentId/teams/:teamId/members",
					config: {
						createLink: "/departments/:departmentId/teams/:teamId/members/add",
						createLabel: "Add Member",
					},
				},
			],
		},
		{
			path: "/departments/:departmentId/teams/:teamId/members/add",
			title: "Add Team Member",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/admin/departments/:departmentId/teams/:teamId/members",
					config: {
						fields: [
							{ key: "userId", label: "User ID", type: "text", required: true },
						],
						submitLabel: "Add to Team",
					},
				},
			],
		},
		{
			path: "/clients",
			title: "OIDC Clients",
			layout: "default",
			sections: [
				{
					type: "data-table",
					endpoint: "/api/admin/clients",
					config: {
						rowLink: "/clients/:clientId",
						createLink: "/clients/new",
						createLabel: "Register Client",
					},
				},
			],
		},
		{
			path: "/clients/new",
			title: "Register OIDC Client",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/admin/clients/register",
					config: {
						title: "Register a New OIDC Client",
						fields: [
							{
								key: "name",
								label: "Client Name",
								type: "text",
								required: true,
							},
							{
								key: "redirectUrls",
								label: "Redirect URLs (comma separated)",
								type: "text",
								required: true,
								placeholder: "http://localhost:4000/callback",
							},
							{
								key: "type",
								label: "Type",
								type: "select",
								options: [
									{ label: "Confidential", value: "confidential" },
									{ label: "Public", value: "public" },
								],
							},
						],
						submitLabel: "Register Client",
					},
				},
			],
		},
		{
			path: "/clients/:clientId",
			title: "Client Detail",
			layout: "default",
			sections: [
				{
					type: "detail",
					endpoint: "/api/admin/clients/:clientId",
					config: {},
				},
				{
					type: "action-bar",
					endpoint: "/api/admin/clients/:clientId/actions",
					config: {},
				},
			],
		},
		{
			path: "/services",
			title: "Service Catalog",
			layout: "default",
			sections: [
				{
					type: "data-table",
					endpoint: "/api/admin/services",
					config: {
						rowLink: "/services/:id",
						createLink: "/services/new",
						createLabel: "Register Service",
					},
				},
			],
		},
		{
			path: "/services/new",
			title: "Register Service",
			layout: "default",
			showBack: true,
			sections: [
				{
					type: "form",
					endpoint: "/api/services/register",
					config: {
						title: "Register a New Service",
						fields: [
							{
								key: "name",
								label: "Service Name",
								type: "text",
								required: true,
							},
							{
								key: "slug",
								label: "Slug",
								type: "text",
								required: true,
								placeholder: "my-service",
							},
							{
								key: "type",
								label: "Type",
								type: "text",
								required: true,
								placeholder: "service",
							},
							{ key: "description", label: "Description", type: "textarea" },
							{
								key: "baseUrl",
								label: "Base URL",
								type: "text",
								required: true,
								placeholder: "http://localhost:5000",
							},
							{
								key: "healthCheckPath",
								label: "Health Check Path",
								type: "text",
								placeholder: "/health",
							},
						],
						submitLabel: "Register Service",
					},
				},
			],
		},
		{
			path: "/services/:serviceId",
			title: "Service Detail",
			layout: "default",
			sections: [
				{
					type: "detail",
					endpoint: "/api/admin/services/:serviceId",
					config: {},
				},
				{
					type: "action-bar",
					endpoint: "/api/admin/services/:serviceId/actions",
					config: {},
				},
			],
		},
		{
			path: "/branding",
			title: "Branding",
			layout: "default",
			sections: [
				{
					type: "detail",
					endpoint: "/api/admin/branding",
					config: { title: "Current Branding" },
				},
				{
					type: "form",
					endpoint: "/api/admin/branding",
					config: {
						title: "Update Branding",
						fields: [
							{ key: "appName", label: "App Name", type: "text" },
							{
								key: "logoUrl",
								label: "Logo URL",
								type: "text",
								placeholder: "https://...",
							},
							{
								key: "faviconUrl",
								label: "Favicon URL",
								type: "text",
								placeholder: "https://...",
							},
							{
								key: "primaryColor",
								label: "Primary Color (oklch)",
								type: "text",
								placeholder: "0.205 0.064 285.885",
							},
							{
								key: "accentColor",
								label: "Accent Color (oklch)",
								type: "text",
								placeholder: "0.205 0.064 285.885",
							},
							{
								key: "backgroundColor",
								label: "Background Color (oklch)",
								type: "text",
								placeholder: "1 0 0",
							},
							{
								key: "foregroundColor",
								label: "Foreground Color (oklch)",
								type: "text",
								placeholder: "0.145 0 0",
							},
							{
								key: "mutedColor",
								label: "Muted Color (oklch)",
								type: "text",
								placeholder: "0.97 0 0",
							},
							{
								key: "destructiveColor",
								label: "Destructive Color (oklch)",
								type: "text",
								placeholder: "0.577 0.245 27.325",
							},
							{
								key: "borderRadius",
								label: "Border Radius",
								type: "text",
								placeholder: "0.5rem",
							},
							{ key: "customCss", label: "Custom CSS", type: "textarea" },
						],
						submitLabel: "Save Branding",
						method: "PUT",
					},
				},
			],
		},
		{
			path: "/settings",
			title: "Settings",
			layout: "default",
			sections: [
				{
					type: "detail",
					endpoint: "/api/admin/settings",
					config: { title: "System Configuration" },
				},
				{
					type: "form",
					endpoint: "/api/admin/settings",
					config: {
						title: "Settings (restart required for OAuth changes)",
						fields: [
							{
								key: "avatarMaxSizeMb",
								label: "Avatar Max Size (MB)",
								type: "number",
								placeholder: "2",
							},
							{
								key: "discordClientId",
								label: "Discord Client ID",
								type: "text",
							},
							{
								key: "discordClientSecret",
								label: "Discord Client Secret",
								type: "password",
							},
							{
								key: "googleClientId",
								label: "Google Client ID",
								type: "text",
							},
							{
								key: "googleClientSecret",
								label: "Google Client Secret",
								type: "password",
							},
							{
								key: "githubClientId",
								label: "GitHub Client ID",
								type: "text",
							},
							{
								key: "githubClientSecret",
								label: "GitHub Client Secret",
								type: "password",
							},
						],
						submitLabel: "Save Settings",
						method: "PUT",
					},
				},
			],
		},
	],
	permissions: ["admin"],
};
