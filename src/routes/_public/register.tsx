import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signUp } from "~/lib/auth-client";

export const Route = createFileRoute("/_public/register")({
	component: RegisterPage,
});

function RegisterPage() {
	const _navigate = useNavigate();
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;
		const username = formData.get("username") as string;
		const email = formData.get("email") as string;
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

		const result = await signUp.email({
			name,
			username,
			email,
			password,
		});

		if (result.error) {
			setError(result.error.message || "Registration failed");
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
				<p className="mt-4 text-[var(--muted-foreground)]">
					We've sent a verification link to your email address. Please click the
					link to verify your account.
				</p>
				<Link
					to="/login"
					className="mt-6 inline-block text-[var(--primary)] hover:underline"
				>
					Back to sign in
				</Link>
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold text-center">Create Account</h1>
			<p className="mt-2 text-center text-sm text-[var(--muted-foreground)]">
				Create a new account to get started.
			</p>

			<form onSubmit={handleSubmit} className="mt-6 space-y-4">
				{error && (
					<div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
						{error}
					</div>
				)}
				<div>
					<label htmlFor="name" className="block text-sm font-medium">
						Full Name
					</label>
					<input
						id="name"
						name="name"
						type="text"
						autoComplete="name"
						required
						minLength={2}
						maxLength={100}
						className="mt-1 block w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
					/>
				</div>
				<div>
					<label htmlFor="username" className="block text-sm font-medium">
						Username
					</label>
					<input
						id="username"
						name="username"
						type="text"
						autoComplete="username"
						required
						minLength={3}
						maxLength={30}
						pattern="[a-zA-Z0-9_-]+"
						title="Letters, numbers, hyphens, and underscores only"
						className="mt-1 block w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
					/>
				</div>
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
						className="mt-1 block w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
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
						Confirm Password
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
					{loading ? "Creating account..." : "Create Account"}
				</button>
			</form>

			<div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
				Already have an account?{" "}
				<Link to="/login" className="text-[var(--primary)] hover:underline">
					Sign in
				</Link>
			</div>
		</div>
	);
}
