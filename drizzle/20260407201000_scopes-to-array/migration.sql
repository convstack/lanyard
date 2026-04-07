-- Convert scopes columns from text (space-separated) to text[] (native PG array).
-- Better Auth's drizzle adapter with provider "pg" expects native arrays for string[] fields.

-- oauth_access_token.scopes
ALTER TABLE "oauth_access_token" ADD COLUMN "scopes_new" text[];
UPDATE "oauth_access_token" SET "scopes_new" = string_to_array("scopes", ' ') WHERE "scopes" IS NOT NULL;
ALTER TABLE "oauth_access_token" DROP COLUMN "scopes";
ALTER TABLE "oauth_access_token" RENAME COLUMN "scopes_new" TO "scopes";

-- oauth_consent.scopes
ALTER TABLE "oauth_consent" ADD COLUMN "scopes_new" text[];
UPDATE "oauth_consent" SET "scopes_new" = string_to_array("scopes", ' ') WHERE "scopes" IS NOT NULL;
ALTER TABLE "oauth_consent" DROP COLUMN "scopes";
ALTER TABLE "oauth_consent" RENAME COLUMN "scopes_new" TO "scopes";

-- oauth_authorization_code.scopes
ALTER TABLE "oauth_authorization_code" ADD COLUMN "scopes_new" text[];
UPDATE "oauth_authorization_code" SET "scopes_new" = string_to_array("scopes", ' ') WHERE "scopes" IS NOT NULL;
ALTER TABLE "oauth_authorization_code" DROP COLUMN "scopes";
ALTER TABLE "oauth_authorization_code" RENAME COLUMN "scopes_new" TO "scopes";

-- oauth_refresh_token.scopes is already text[] (created in the oauth-provider-migration)
-- No change needed for that table.
