-- Add all missing columns for @better-auth/oauth-provider compatibility.
-- Covers oauthAccessToken, oauthClient, and oauthConsent tables.

-- oauthAccessToken: add missing columns
ALTER TABLE "oauth_access_token" ADD COLUMN IF NOT EXISTS "refresh_id" text;
ALTER TABLE "oauth_access_token" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;

-- oauthClient: add missing array columns and other fields
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "scopes" text[];
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "contacts" text[];
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "grant_types" text[];
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "response_types" text[];
ALTER TABLE "oauth_client" ADD COLUMN IF NOT EXISTS "post_logout_redirect_uris" text[];

-- oauthConsent: add reference_id
ALTER TABLE "oauth_consent" ADD COLUMN IF NOT EXISTS "reference_id" text;

-- Convert oauthConsent.scopes to array if still text
-- (already handled by scopes-to-array migration, but just in case)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'oauth_consent' AND column_name = 'scopes' AND data_type = 'text'
    ) THEN
        EXECUTE 'ALTER TABLE "oauth_consent" ADD COLUMN "scopes_arr" text[]';
        EXECUTE 'UPDATE "oauth_consent" SET "scopes_arr" = string_to_array("scopes", '' '') WHERE "scopes" IS NOT NULL';
        EXECUTE 'ALTER TABLE "oauth_consent" DROP COLUMN "scopes"';
        EXECUTE 'ALTER TABLE "oauth_consent" RENAME COLUMN "scopes_arr" TO "scopes"';
    END IF;
END $$;
