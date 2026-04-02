import type { UIManifest } from "~/db/schema/service-catalog";

export const LANYARD_ADMIN_MANIFEST: UIManifest = {
	name: "Administration",
	icon: "shield",
	version: "1.0.0",
	navigation: [
		{ label: "Overview", path: "/", icon: "layout-dashboard" },
		{ label: "Users", path: "/users", icon: "users" },
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
					config: { rowLink: "/users/:id" },
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
			path: "/clients",
			title: "OIDC Clients",
			layout: "default",
			sections: [
				{
					type: "data-table",
					endpoint: "/api/admin/clients",
					config: { rowLink: "/clients/:clientId" },
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
			],
		},
		{
			path: "/services",
			title: "Service Catalog",
			layout: "default",
			sections: [
				{ type: "data-table", endpoint: "/api/admin/services", config: {} },
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
						title: "Upload Settings",
						fields: [
							{
								key: "avatarMaxSizeMb",
								label: "Avatar Max Size (MB)",
								type: "number",
								placeholder: "2",
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
