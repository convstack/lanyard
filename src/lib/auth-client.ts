import { passkeyClient } from "@better-auth/passkey/client";
import {
	adminClient,
	oidcClient,
	organizationClient,
	twoFactorClient,
	usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	plugins: [
		oidcClient(),
		adminClient(),
		twoFactorClient(),
		usernameClient(),
		organizationClient(),
		passkeyClient(),
	],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
