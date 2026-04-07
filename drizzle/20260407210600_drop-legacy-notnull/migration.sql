-- Drop NOT NULL constraints on legacy columns that the new oauth-provider plugin doesn't use.
-- The plugin uses "token" instead of "access_token", and doesn't write to the old columns.

ALTER TABLE "oauth_access_token" ALTER COLUMN "access_token" DROP NOT NULL;
ALTER TABLE "oauth_access_token" ALTER COLUMN "access_token_expires_at" DROP NOT NULL;
ALTER TABLE "oauth_access_token" ALTER COLUMN "refresh_token" DROP NOT NULL;
ALTER TABLE "oauth_access_token" ALTER COLUMN "refresh_token_expires_at" DROP NOT NULL;
ALTER TABLE "oauth_access_token" ALTER COLUMN "scopes" DROP NOT NULL;
ALTER TABLE "oauth_access_token" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "oauth_access_token" ALTER COLUMN "client_id" DROP NOT NULL;
ALTER TABLE "oauth_access_token" ALTER COLUMN "created_at" DROP NOT NULL;
ALTER TABLE "oauth_access_token" ALTER COLUMN "updated_at" DROP NOT NULL;
