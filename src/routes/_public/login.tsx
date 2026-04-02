import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, signIn } from "~/lib/auth-client";
import {
	getDashboardUrlFn,
	getEnabledProvidersFn,
} from "~/server/functions/auth";

export const Route = createFileRoute("/_public/login")({
	loader: async () => {
		const [providers, dashboardUrl] = await Promise.all([
			getEnabledProvidersFn(),
			getDashboardUrlFn(),
		]);
		return { providers, dashboardUrl };
	},
	component: LoginPage,
});

function LoginPage() {
	const { providers, dashboardUrl } = Route.useLoaderData();
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [showTwoFactor, setShowTwoFactor] = useState(false);
	const [twoFactorCode, setTwoFactorCode] = useState("");

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		const result = await signIn.email({
			email,
			password,
		});

		if (result.error) {
			if (result.error.message?.includes("two-factor")) {
				setShowTwoFactor(true);
				setLoading(false);
				return;
			}
			setError(result.error.message || "Login failed");
			setLoading(false);
			return;
		}

		window.location.href = dashboardUrl;
	};

	const handleTwoFactor = async (e: React.SubmitEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		const result = await authClient.twoFactor.verifyTotp({
			code: twoFactorCode,
		});

		if (result.error) {
			setError(result.error.message || "Invalid code");
			setLoading(false);
			return;
		}

		window.location.href = dashboardUrl;
	};

	const handleSocialLogin = async (
		provider: "discord" | "google" | "github",
	) => {
		await signIn.social({ provider, callbackURL: dashboardUrl });
	};

	const handlePasskeyLogin = async () => {
		setError("");
		const result = await authClient.signIn.passkey();
		if (result?.error) {
			setError(String(result.error.message || "Passkey login failed"));
			return;
		}
		window.location.href = dashboardUrl;
	};

	if (showTwoFactor) {
		return (
			<div>
				<h1 className="text-2xl font-bold text-center">
					Two-Factor Authentication
				</h1>
				<p className="mt-2 text-center text-sm text-(--muted-foreground)">
					Enter the code from your authenticator app.
				</p>
				<form onSubmit={handleTwoFactor} className="mt-6 space-y-4">
					{error && (
						<div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
							{error}
						</div>
					)}
					<div>
						<label htmlFor="code" className="block text-sm font-medium">
							Verification Code
						</label>
						<input
							id="code"
							type="text"
							inputMode="numeric"
							autoComplete="one-time-code"
							value={twoFactorCode}
							onChange={(e) => setTwoFactorCode(e.target.value)}
							className="mt-1 block w-full rounded-md border border-(--input) bg-(--background) px-3 py-2 text-sm"
							placeholder="000000"
							maxLength={6}
							required
						/>
					</div>
					<button
						type="submit"
						disabled={loading}
						className="w-full rounded-md bg-(--primary) px-4 py-2 text-sm font-medium text-(--primary-foreground) hover:opacity-90 disabled:opacity-50"
					>
						{loading ? "Verifying..." : "Verify"}
					</button>
				</form>
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold text-center">Sign In</h1>
			<p className="mt-2 text-center text-sm text-(--muted-foreground)">
				Sign in to your account to continue.
			</p>

			<form onSubmit={handleSubmit} className="mt-6 space-y-4">
				{error && (
					<div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
						{error}
					</div>
				)}
				<div>
					<label htmlFor="email" className="block text-sm font-medium">
						Email
					</label>
					<input
						id="email"
						name="email"
						type="email"
						autoComplete="email"
						required
						className="mt-1 block w-full rounded-md border border-(--input) bg-(--background) px-3 py-2 text-sm"
					/>
				</div>
				<div>
					<label htmlFor="password" className="block text-sm font-medium">
						Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
						className="mt-1 block w-full rounded-md border border-(--input) bg-(--background) px-3 py-2 text-sm"
					/>
				</div>
				<button
					type="submit"
					disabled={loading}
					className="w-full rounded-md bg-(--primary) px-4 py-2 text-sm font-medium text-(--primary-foreground) hover:opacity-90 disabled:opacity-50"
				>
					{loading ? "Signing in..." : "Sign In"}
				</button>
			</form>

			<button
				type="button"
				onClick={handlePasskeyLogin}
				className="mt-3 w-full rounded-md border border-(--border) px-4 py-2 text-sm font-medium hover:bg-(--accent)"
			>
				Sign in with Passkey
			</button>

			{(providers.discord || providers.google || providers.github) && (
				<div className="mt-6">
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-(--border)" />
						</div>
						<div className="relative flex justify-center text-sm">
							<span className="bg-(--background) px-2 text-(--muted-foreground)">
								Or continue with
							</span>
						</div>
					</div>
					<div className="mt-4 flex flex-col gap-2">
						{providers.discord && (
							<button
								type="button"
								onClick={() => handleSocialLogin("discord")}
								className="w-full rounded-md border border-(--border) px-4 py-2 text-sm font-medium hover:bg-(--accent)"
							>
								Discord
							</button>
						)}
						{providers.google && (
							<button
								type="button"
								onClick={() => handleSocialLogin("google")}
								className="w-full rounded-md border border-(--border) px-4 py-2 text-sm font-medium hover:bg-(--accent)"
							>
								Google
							</button>
						)}
						{providers.github && (
							<button
								type="button"
								onClick={() => handleSocialLogin("github")}
								className="w-full rounded-md border border-(--border) px-4 py-2 text-sm font-medium hover:bg-(--accent)"
							>
								GitHub
							</button>
						)}
					</div>
				</div>
			)}

			<div className="mt-6 text-center text-sm">
				<Link
					to="/forgot-password"
					className="text-(--primary) hover:underline"
				>
					Forgot your password?
				</Link>
			</div>
			<div className="mt-2 text-center text-sm text-(--muted-foreground)">
				Don't have an account?{" "}
				<Link to="/register" className="text-(--primary) hover:underline">
					Sign up
				</Link>
			</div>
		</div>
	);
}
