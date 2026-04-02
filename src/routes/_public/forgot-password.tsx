import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_public/forgot-password")({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;

		const result = await authClient.requestPasswordReset({
			email,
			redirectTo: "/reset-password",
		});

		if (result.error) {
			setError(result.error.message || "Failed to send reset email");
			setLoading(false);
			return;
		}

		setSuccess(true);
		setLoading(false);
	};

	if (success) {
		return (
			<div className="text-center">
				<h1 className="text-2xl font-bold">Check your email</h1>
				<p className="mt-4 text-(--muted-foreground)">
					If an account exists with that email, we've sent a password reset
					link.
				</p>
				<Link
					to="/login"
					className="mt-6 inline-block text-(--primary) hover:underline"
				>
					Back to sign in
				</Link>
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold text-center">Forgot Password</h1>
			<p className="mt-2 text-center text-sm text-(--muted-foreground)">
				Enter your email and we'll send you a reset link.
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
				<button
					type="submit"
					disabled={loading}
					className="w-full rounded-md bg-(--primary) px-4 py-2 text-sm font-medium text-(--primary-foreground) hover:opacity-90 disabled:opacity-50"
				>
					{loading ? "Sending..." : "Send Reset Link"}
				</button>
			</form>

			<div className="mt-6 text-center text-sm">
				<Link to="/login" className="text-(--primary) hover:underline">
					Back to sign in
				</Link>
			</div>
		</div>
	);
}
