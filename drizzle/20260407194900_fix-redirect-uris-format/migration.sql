-- Convert redirect_uris from comma-separated string to JSON array string
-- Old format: "http://localhost:4000/callback,http://localhost:4000/login"
-- New format: ["http://localhost:4000/callback","http://localhost:4000/login"]
UPDATE "oauth_client"
SET "redirect_uris" = (
    SELECT '[' || string_agg('"' || trim(val) || '"', ',') || ']'
    FROM unnest(string_to_array("redirect_uris", ',')) AS val
)
WHERE "redirect_uris" IS NOT NULL
  AND "redirect_uris" NOT LIKE '[%';
