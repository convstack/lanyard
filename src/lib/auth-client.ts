import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { passkeyClient } from "@better-auth/passkey/client";
import {
	adminClient,
	organizationClient,
	twoFactorClient,
	usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	plugins: [
		oauthProviderClient(),
		adminClient(),
		twoFactorClient(),
		usernameClient(),
		organizationClient(),
		passkeyClient(),
	],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
