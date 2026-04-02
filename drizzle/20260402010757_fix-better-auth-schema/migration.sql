ALTER TABLE "oauth_application" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "oauth_application" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "passkey" ALTER COLUMN "device_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "passkey" ALTER COLUMN "backed_up" SET NOT NULL;