-- Migration: oauth-provider plugin (replaces oidc-provider)
-- Creates oauth_client (replaces oauth_application) and oauth_refresh_token tables.
-- Better Auth manages all columns on these tables.

-- Rename oauth_application to oauth_client
ALTER TABLE IF EXISTS "oauth_application" RENAME TO "oauth_client";

-- Rename redirect column: old plugin used redirectUrls (redirect_ur_ls),
-- new plugin uses redirectUris (redirect_uris)
ALTER TABLE "oauth_client" RENAME COLUMN "redirect_ur_ls" TO "redirect_uris";

-- Add new columns that the oauth-provider plugin expects on oauth_client
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "skip_consent" boolean;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "enable_end_session" boolean;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "subject_type" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "scopes" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "uri" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "contacts" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "tos" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "policy" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "software_id" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "software_version" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "software_statement" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "post_logout_redirect_uris" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "token_endpoint_auth_method" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "grant_types" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "response_types" text;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "public" boolean;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "require_pkce" boolean;
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "reference_id" text;

-- Add new columns on oauth_access_token for the new plugin
ALTER TABLE "oauth_access_token" ADD COLUMN IF NOT EXISTS "token" text;
ALTER TABLE "oauth_access_token" ADD COLUMN IF NOT EXISTS "session_id" text;
ALTER TABLE "oauth_access_token" ADD COLUMN IF NOT EXISTS "reference_id" text;
ALTER TABLE "oauth_access_token" ADD COLUMN IF NOT EXISTS "auth_time" timestamp;
ALTER TABLE "oauth_access_token" ADD COLUMN IF NOT EXISTS "revoked" timestamp;

-- Create oauth_refresh_token table (new in oauth-provider)
CREATE TABLE IF NOT EXISTS "oauth_refresh_token" (
    "id" text PRIMARY KEY,
    "token" text NOT NULL,
    "client_id" text NOT NULL,
    "session_id" text,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "reference_id" text,
    "expires_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "revoked" timestamp,
    "auth_time" timestamp,
    "scopes" text NOT NULL
);
