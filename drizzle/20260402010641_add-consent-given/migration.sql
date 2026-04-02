CREATE TABLE "service_catalog_audit_log" (
	"id" text PRIMARY KEY,
	"service_id" text NOT NULL,
	"action" text NOT NULL,
	"details" jsonb,
	"performed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_catalog_entry" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"type" text NOT NULL,
	"description" text,
	"version" text,
	"base_url" text NOT NULL,
	"health_check_path" text DEFAULT '/health' NOT NULL,
	"ui_manifest" jsonb,
	"api_key_hash" text NOT NULL,
	"api_key_prefix" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_health_check" timestamp,
	"last_health_status" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"registered_by" text,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_permission" (
	"id" text PRIMARY KEY,
	"service_id" text NOT NULL,
	"permission" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_role_permission" (
	"id" text PRIMARY KEY,
	"service_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD COLUMN "consent_given" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "service_catalog_audit_log" ADD CONSTRAINT "service_catalog_audit_log_Tar1cw1I0eV5_fkey" FOREIGN KEY ("service_id") REFERENCES "service_catalog_entry"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "service_catalog_entry" ADD CONSTRAINT "service_catalog_entry_registered_by_user_id_fkey" FOREIGN KEY ("registered_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "service_permission" ADD CONSTRAINT "service_permission_service_id_service_catalog_entry_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_catalog_entry"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "service_role_permission" ADD CONSTRAINT "service_role_permission_TOjDZRatm3Zl_fkey" FOREIGN KEY ("service_id") REFERENCES "service_catalog_entry"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "service_role_permission" ADD CONSTRAINT "service_role_permission_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;