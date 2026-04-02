import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_public/reset-password")({
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const _navigate = useNavigate();
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const password = formData.get("password") as string;
		const confirmPassword = formData.get("confirmPassword") as string;

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			setLoading(false);
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			setLoading(false);
			return;
		}

		const result = await authClient.resetPassword({
			newPassword: password,
		});

		if (result.error) {
			setError(result.error.message || "Failed to reset password");
			setLoading(false);
			return;
		}

		setSuccess(true);
		setLoading(false);
	};

	if (success) {
		return (
			<div className="text-center">
				<h1 className="text-2xl font-bold">Password Reset</h1>
				<p className="mt-4 text-[var(--muted-foreground)]">
					Your password has been reset successfully.
				</p>
				<Link
					to="/login"
					className="mt-6 inline-block text-[var(--primary)] hover:underline"
				>
					Sign in with your new password
				</Link>
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold text-center">Reset Password</h1>
			<p className="mt-2 text-center text-sm text-[var(--muted-foreground)]">
				Enter your new password.
			</p>

			<form onSubmit={handleSubmit} className="mt-6 space-y-4">
				{error && (
					<div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
						{error}
					</div>
				)}
				<div>
					<label htmlFor="password" className="block text-sm font-medium">
						New Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						autoComplete="new-password"
						required
						minLength={8}
						maxLength={128}
						className="mt-1 block w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
					/>
				</div>
				<div>
					<label
						htmlFor="confirmPassword"
						className="block text-sm font-medium"
					>
						Confirm New Password
					</label>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						autoComplete="new-password"
						required
						className="mt-1 block w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
					/>
				</div>
				<button
					type="submit"
					disabled={loading}
					className="w-full rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
				>
					{loading ? "Resetting..." : "Reset Password"}
				</button>
			</form>
		</div>
	);
}
