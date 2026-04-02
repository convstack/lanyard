import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { useState } from "react";
import { db } from "~/db";
import { oauthApplication } from "~/db/schema";
import { auth } from "~/lib/auth";
import { authClient } from "~/lib/auth-client";

const getConsentInfoFn = createServerFn({ method: "GET" })
	.inputValidator((data: { clientId: string; scope: string }) => data)
	.handler(async ({ data }) => {
		const request = getRequest();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session) throw new Error("Not authenticated");

		const [client] = await db
			.select({ name: oauthApplication.name, icon: oauthApplication.icon })
			.from(oauthApplication)
			.where(eq(oauthApplication.clientId, data.clientId));

		return {
			clientName: client?.name || data.clientId,
			clientIcon: client?.icon || null,
			scopes: data.scope.split(" ").filter(Boolean),
			userName: session.user.name,
			userEmail: session.user.email,
		};
	});

export const Route = createFileRoute("/oauth/consent")({
	validateSearch: (search: Record<string, unknown>) => ({
		consent_code: (search.consent_code as string) || "",
		client_id: (search.client_id as string) || "",
		scope: (search.scope as string) || "",
	}),
	loaderDeps: ({ search }) => ({ search }),
	loader: async ({ deps: { search } }) => {
		const info = await getConsentInfoFn({
			data: { clientId: search.client_id, scope: search.scope },
		});
		return { info, search };
	},
	component: ConsentPage,
});

function ConsentPage() {
	const { info, search } = Route.useLoaderData();
	const [loading, setLoading] = useState(false);

	const handleConsent = async (accept: boolean) => {
		setLoading(true);
		const result = await authClient.oauth2.consent({
			consent_code: search.consent_code,
			accept,
		});
		if (result.data?.redirectURI) {
			window.location.href = result.data.redirectURI;
		}
	};

	const scopeLabels: Record<string, string> = {
		openid: "Verify your identity",
		profile: "Access your profile information (name, avatar)",
		email: "Access your email address",
		offline_access: "Maintain access when you're not using the app",
	};

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<div className="w-full max-w-md space-y-6">
				<div className="text-center">
					{info.clientIcon && (
						<img
							src={info.clientIcon}
							alt=""
							className="mx-auto mb-4 h-16 w-16 rounded-lg"
						/>
					)}
					<h1 className="text-2xl font-bold">Authorize Application</h1>
					<p className="mt-2 text-sm text-(--muted-foreground)">
						<strong>{info.clientName}</strong> wants to access your account.
					</p>
				</div>

				<div className="rounded-lg border border-(--border) p-4">
					<p className="text-sm font-medium mb-3">
						This will allow {info.clientName} to:
					</p>
					<ul className="space-y-2">
						{info.scopes.map((scope: string) => (
							<li key={scope} className="flex items-center gap-2 text-sm">
								<span className="h-1.5 w-1.5 rounded-full bg-(--primary)" />
								{scopeLabels[scope] || scope}
							</li>
						))}
					</ul>
				</div>

				<p className="text-xs text-center text-(--muted-foreground)">
					Signed in as <strong>{info.userName || info.userEmail}</strong>
				</p>

				<div className="flex gap-3">
					<button
						type="button"
						onClick={() => handleConsent(false)}
						disabled={loading}
						className="flex-1 rounded-md border border-(--border) px-4 py-2 text-sm font-medium hover:bg-(--accent) disabled:opacity-50"
					>
						Deny
					</button>
					<button
						type="button"
						onClick={() => handleConsent(true)}
						disabled={loading}
						className="flex-1 rounded-md bg-(--primary) px-4 py-2 text-sm font-medium text-(--primary-foreground) hover:opacity-90 disabled:opacity-50"
					>
						{loading ? "Authorizing..." : "Authorize"}
					</button>
				</div>
			</div>
		</div>
	);
}
