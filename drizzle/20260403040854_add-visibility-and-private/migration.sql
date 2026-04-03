ALTER TABLE "organization" ADD COLUMN "private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "service_catalog_entry" ADD COLUMN "visibility" text DEFAULT 'all' NOT NULL;