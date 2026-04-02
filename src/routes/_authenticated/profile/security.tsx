import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "~/lib/auth-client";

interface PasskeyInfo {
	id: string;
	name: string | null;
	credentialID: string;
	createdAt: Date;
}

export const Route = createFileRoute("/_authenticated/profile/security")({
	component: SecurityPage,
});

function SecurityPage() {
	const { session } = Route.useRouteContext();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [totpUri, setTotpUri] = useState<string | null>(null);
	const [verifyCode, setVerifyCode] = useState("");
	const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
	const [passkeysLoading, setPasskeysLoading] = useState(true);

	const loadPasskeys = useCallback(async () => {
		setPasskeysLoading(true);
		const result = await authClient.passkey.listUserPasskeys();
		if (!result.error) {
			setPasskeys((result.data as PasskeyInfo[]) || []);
		}
		setPasskeysLoading(false);
	}, []);

	useEffect(() => {
		loadPasskeys();
	}, [loadPasskeys]);

	const enable2FA = async () => {
		setLoading(true);
		setError("");
		const result = await authClient.twoFactor.enable({
			password: prompt("Enter your password to enable 2FA") || "",
		});
		if (result.error) {
			setError(result.error.message || "Failed to enable 2FA");
		} else {
			setTotpUri(result.data?.totpURI || null);
		}
		setLoading(false);
	};

	const verify2FA = async () => {
		setLoading(true);
		setError("");
		const result = await authClient.twoFactor.verifyTotp({
			code: verifyCode,
		});
		if (result.error) {
			setError(result.error.message || "Invalid code");
		} else {
			setSuccess("Two-factor authentication enabled successfully.");
			setTotpUri(null);
		}
		setLoading(false);
	};

	const disable2FA = async () => {
		if (!confirm("Are you sure you want to disable 2FA?")) return;
		setLoading(true);
		setError("");
		const result = await authClient.twoFactor.disable({
			password: prompt("Enter your password to disable 2FA") || "",
		});
		if (result.error) {
			setError(result.error.message || "Failed to disable 2FA");
		} else {
			setSuccess("Two-factor authentication disabled.");
		}
		setLoading(false);
	};

	const registerPasskey = async () => {
		const name = prompt(
			"Enter a name for this passkey (e.g. 'MacBook fingerprint')",
		);
		if (!name) return;

		setLoading(true);
		setError("");
		setSuccess("");
		const result = await authClient.passkey.addPasskey({ name });
		if (result?.error) {
			setError(String(result.error.message || "Failed to register passkey"));
		} else {
			setSuccess("Passkey registered successfully.");
			await loadPasskeys();
		}
		setLoading(false);
	};

	const deletePasskey = async (passkeyId: string, name: string | null) => {
		const password = prompt(
			`Enter your password to delete passkey "${name || "Unnamed"}"`,
		);
		if (!password) return;

		const verifyResult = await authClient.signIn.email({
			email: session.user.email,
			password,
		});
		if (verifyResult.error) {
			setError("Incorrect password.");
			return;
		}

		setLoading(true);
		setError("");
		setSuccess("");
		const result = await authClient.passkey.deletePasskey({ id: passkeyId });
		if (result?.error) {
			setError(String(result.error.message || "Failed to delete passkey"));
		} else {
			setSuccess("Passkey deleted.");
			setPasskeys((prev) => prev.filter((p) => p.id !== passkeyId));
		}
		setLoading(false);
	};

	return (
		<div>
			<h1 className="text-2xl font-bold">Security</h1>
			<p className="mt-1 text-sm text-(--muted-foreground)">
				Manage your security settings.
			</p>

			{error && (
				<div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
					{error}
				</div>
			)}
			{success && (
				<div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
					{success}
				</div>
			)}

			<div className="mt-6 space-y-6">
				<section className="rounded-lg border border-(--border) bg-(--card) p-6">
					<div className="flex items-start justify-between">
						<div>
							<h2 className="text-lg font-semibold">
								Two-Factor Authentication
							</h2>
							<p className="mt-1 text-sm text-(--muted-foreground)">
								Add an extra layer of security with TOTP-based 2FA.
							</p>
						</div>
						{!totpUri &&
							((session.user as { twoFactorEnabled?: boolean })
								.twoFactorEnabled ? (
								<span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
									Enabled
								</span>
							) : (
								<span className="rounded-full bg-(--muted) px-2.5 py-0.5 text-xs font-medium text-(--muted-foreground)">
									Disabled
								</span>
							))}
					</div>
					<div className="mt-4">
						{totpUri ? (
							<div className="space-y-4">
								<p className="text-sm">
									Scan this URI with your authenticator app, then enter the code
									below:
								</p>
								<code className="block break-all rounded bg-(--muted) p-3 text-xs">
									{totpUri}
								</code>
								<div className="flex gap-2">
									<input
										type="text"
										inputMode="numeric"
										value={verifyCode}
										onChange={(e) => setVerifyCode(e.target.value)}
										placeholder="000000"
										maxLength={6}
										className="rounded-md border border-(--input) bg-(--background) px-3 py-2 text-sm"
									/>
									<button
										type="button"
										onClick={verify2FA}
										disabled={loading}
										className="rounded-md bg-(--primary) px-4 py-2 text-sm font-medium text-(--primary-foreground) hover:opacity-90 disabled:opacity-50"
									>
										Verify
									</button>
								</div>
							</div>
						) : (session.user as { twoFactorEnabled?: boolean })
								.twoFactorEnabled ? (
							<button
								type="button"
								onClick={disable2FA}
								disabled={loading}
								className="rounded-md border border-(--destructive) px-4 py-2 text-sm font-medium text-(--destructive) hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
							>
								Disable 2FA
							</button>
						) : (
							<button
								type="button"
								onClick={enable2FA}
								disabled={loading}
								className="rounded-md bg-(--primary) px-4 py-2 text-sm font-medium text-(--primary-foreground) hover:opacity-90 disabled:opacity-50"
							>
								Enable 2FA
							</button>
						)}
					</div>
				</section>

				<section className="rounded-lg border border-(--border) bg-(--card) p-6">
					<div className="flex items-start justify-between">
						<div>
							<h2 className="text-lg font-semibold">Passkeys</h2>
							<p className="mt-1 text-sm text-(--muted-foreground)">
								Use biometrics or security keys for passwordless authentication.
							</p>
						</div>
						<button
							type="button"
							onClick={registerPasskey}
							disabled={loading}
							className="rounded-md bg-(--primary) px-4 py-2 text-sm font-medium text-(--primary-foreground) hover:opacity-90 disabled:opacity-50"
						>
							Register Passkey
						</button>
					</div>

					<div className="mt-4">
						{passkeysLoading ? (
							<p className="text-sm text-(--muted-foreground)">
								Loading passkeys...
							</p>
						) : passkeys.length === 0 ? (
							<p className="text-sm text-(--muted-foreground)">
								No passkeys registered.
							</p>
						) : (
							<div className="rounded-md border border-(--border) divide-y divide-(--border)">
								{passkeys.map((pk) => (
									<div
										key={pk.id}
										className="flex items-center justify-between p-3"
									>
										<div className="min-w-0">
											<p className="text-sm font-medium">
												{pk.name || "Unnamed passkey"}
											</p>
											<p className="text-xs text-(--muted-foreground)">
												Added {new Date(pk.createdAt).toLocaleDateString()}
											</p>
										</div>
										<button
											type="button"
											onClick={() => deletePasskey(pk.id, pk.name)}
											disabled={loading}
											className="ml-4 shrink-0 text-sm text-(--destructive) hover:underline disabled:opacity-50"
										>
											Delete
										</button>
									</div>
								))}
							</div>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}
