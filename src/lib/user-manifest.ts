import type { UIManifest } from "~/db/schema/service-catalog";

export const MY_ACCOUNT_MANIFEST: UIManifest = {
	name: "My Account",
	icon: "circle-user",
	version: "1.0.0",
	navigation: [
		{ label: "Profile", path: "/", icon: "user" },
		{ label: "Sessions", path: "/sessions", icon: "monitor-smartphone" },
		{ label: "Connected Apps", path: "/connected-apps", icon: "unplug" },
		{ label: "Change Password", path: "/password", icon: "lock" },
		{
			label: "Security",
			path: "/security",
			icon: "shield-check",
		},
	],
	widgets: [],
	pages: [
		{
			path: "/",
			title: "Profile",
			layout: "default",
			sections: [
				{
					type: "detail",
					endpoint: "/api/user/profile",
					config: { title: "Your Profile" },
				},
				{
					type: "form",
					endpoint: "/api/user/profile",
					config: {
						title: "Edit Profile",
						fields: [
							{ key: "name", label: "Display Name", type: "text" },
							{
								key: "image",
								label: "Avatar",
								type: "file",
								uploadEndpoint: "/api/upload/avatar",
								accept: "image/jpeg,image/png,image/gif,image/webp",
							},
						],
						submitLabel: "Save Changes",
						method: "PUT",
					},
				},
			],
		},
		{
			path: "/sessions",
			title: "Active Sessions",
			layout: "default",
			sections: [
				{
					type: "data-table",
					endpoint: "/api/user/sessions",
					config: {
						rowActions: [
							{
								label: "Revoke",
								endpoint: "/api/user/sessions/:id/revoke",
								method: "POST",
								variant: "danger",
								confirm: "Revoke this session? The device will be signed out.",
							},
						],
					},
				},
			],
		},
		{
			path: "/connected-apps",
			title: "Connected Applications",
			layout: "default",
			sections: [
				{
					type: "data-table",
					endpoint: "/api/user/connected-apps",
					config: {
						rowActions: [
							{
								label: "Revoke",
								endpoint: "/api/user/connected-apps/:id/revoke",
								method: "POST",
								variant: "danger",
								confirm: "Revoke access for this application?",
							},
						],
					},
				},
			],
		},
		{
			path: "/password",
			title: "Change Password",
			layout: "default",
			sections: [
				{
					type: "form",
					endpoint: "/api/user/password",
					config: {
						title: "Change Your Password",
						fields: [
							{
								key: "currentPassword",
								label: "Current Password",
								type: "password",
								required: true,
							},
							{
								key: "newPassword",
								label: "New Password",
								type: "password",
								required: true,
							},
						],
						submitLabel: "Change Password",
					},
				},
				{
					type: "detail",
					endpoint: "/api/user/security-status",
					config: { title: "Security Status" },
				},
			],
		},
		{
			path: "/security",
			title: "Security",
			layout: "default",
			sections: [
				{
					type: "two-factor",
					endpoint: "",
					config: {},
				},
				{
					type: "passkey-manager",
					endpoint: "",
					config: {},
				},
			],
		},
	],
	permissions: [],
};
