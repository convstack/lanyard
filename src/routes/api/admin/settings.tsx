import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedUser } from "~/lib/verify-access-token";

export const Route = createFileRoute("/api/admin/settings")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const user = await getAuthenticatedUser(request);
				if (!user || user.role !== "admin") {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const discordAuth = Boolean(process.env.DISCORD_CLIENT_ID);
				const googleAuth = Boolean(process.env.GOOGLE_CLIENT_ID);
				const githubAuth = Boolean(process.env.GITHUB_CLIENT_ID);
				const emailEnabled = Boolean(
					process.env.SMTP_HOST ?? process.env.RESEND_API_KEY,
				);

				return new Response(
					JSON.stringify({
						fields: [
							{
								key: "discordAuth",
								label: "Discord OAuth",
								value: discordAuth,
							},
							{ key: "googleAuth", label: "Google OAuth", value: googleAuth },
							{ key: "githubAuth", label: "GitHub OAuth", value: githubAuth },
							{
								key: "emailEnabled",
								label: "Email Configured",
								value: emailEnabled,
							},
							{ key: "rateLimit", label: "Rate Limiting", value: true },
							{ key: "twoFactor", label: "Two-Factor Auth", value: true },
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
