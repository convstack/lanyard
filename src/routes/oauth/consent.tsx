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
		if (!data.clientId) {
			return {
				error: "Missing client_id parameter.",
				clientName: null,
				clientIcon: null,
				scopes: [],
				userName: null,
				userEmail: null,
			};
		}

		const request = getRequest();
		const session = await auth.api.getSession({
			headers: request.headers,
		});
		if (!session) {
			return {
				error: "You must be signed in to authorize an application.",
				clientName: null,
				clientIcon: null,
				scopes: [],
				userName: null,
				userEmail: null,
			};
		}

		const [client] = await db
			.select({
				name: oauthApplication.name,
				icon: oauthApplication.icon,
			})
			.from(oauthApplication)
			.where(eq(oauthApplication.clientId, data.clientId));

		if (!client) {
			return {
				error: `Unknown application "${data.clientId}". The client_id is not registered.`,
				clientName: null,
				clientIcon: null,
				scopes: [],
				userName: null,
				userEmail: null,
			};
		}

		const scopes = data.scope ? data.scope.split(" ").filter(Boolean) : [];
		if (scopes.length === 0) {
			return {
				error:
					"No scopes requested. The application must request at least one scope.",
				clientName: client.name,
				clientIcon: client.icon,
				scopes: [],
				userName: session.user.name,
				userEmail: session.user.email,
			};
		}

		return {
			error: null,
			clientName: client.name || data.clientId,
			clientIcon: client.icon || null,
			scopes,
			userName: session.user.name,
			userEmail: session.user.email,
		};
	});

export const Route = createFileRoute("/oauth/consent")({
	validateSearch: (search: Record<string, unknown>) => ({
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
	const [error, setError] = useState("");

	// Show error state if consent info is invalid
	if (info.error) {
		return (
			<div className="flex min-h-screen items-center justify-center p-4">
				<div className="w-full max-w-md space-y-6 text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
						<svg
							className="h-8 w-8 text-red-600 dark:text-red-400"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={2}
							stroke="currentColor"
							role="img"
							aria-label="Error"
						>
							<title>Error</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
							/>
						</svg>
					</div>
					<h1 className="text-2xl font-bold">Authorization Error</h1>
					<p className="text-sm text-(--muted-foreground)">{info.error}</p>
					<a
						href="/"
						className="inline-block rounded-md bg-(--primary) px-4 py-2 text-sm font-medium text-(--primary-foreground) hover:opacity-90"
					>
						Go to Home
					</a>
				</div>
			</div>
		);
	}

	const handleConsent = async (accept: boolean) => {
		setLoading(true);
		setError("");
		const result = await authClient.oauth2.consent({
			accept,
			scope: search.scope,
			oauth_query: window.location.search,
		});
		if (result.error) {
			setError(
				result.error.message ||
					"Authorization failed. Please try signing in again.",
			);
			setLoading(false);
			return;
		}
		if (result.data?.url) {
			window.location.href = result.data.url;
		} else {
			setError("Authorization failed. Please try signing in again.");
			setLoading(false);
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

				{error && (
					<div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
						{error}
					</div>
				)}

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
