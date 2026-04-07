-- Convert redirect_uris from text (JSON string) to text[] (native PG array).
-- Better Auth's drizzle adapter with provider "pg" expects native arrays.

-- Step 1: Add a temporary column with the correct type
ALTER TABLE "oauth_client" ADD COLUMN "redirect_uris_new" text[];

-- Step 2: Migrate data - parse JSON array strings into native PG arrays
UPDATE "oauth_client"
SET "redirect_uris_new" = (
    SELECT array_agg(elem)
    FROM json_array_elements_text("redirect_uris"::json) AS elem
)
WHERE "redirect_uris" IS NOT NULL AND "redirect_uris" LIKE '[%';

-- Step 3: Handle any remaining comma-separated values (non-JSON)
UPDATE "oauth_client"
SET "redirect_uris_new" = string_to_array("redirect_uris", ',')
WHERE "redirect_uris" IS NOT NULL AND "redirect_uris" NOT LIKE '[%' AND "redirect_uris_new" IS NULL;

-- Step 4: Drop old column and rename new one
ALTER TABLE "oauth_client" DROP COLUMN "redirect_uris";
ALTER TABLE "oauth_client" RENAME COLUMN "redirect_uris_new" TO "redirect_uris";
