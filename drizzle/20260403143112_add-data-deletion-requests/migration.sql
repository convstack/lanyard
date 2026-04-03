CREATE TABLE "data_deletion_request" (
	"id" text PRIMARY KEY,
	"user_id" text,
	"user_email" text NOT NULL,
	"user_name" text NOT NULL,
	"reason" text NOT NULL,
	"additional_info" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_note" text,
	"scheduled_deletion_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deletion_pending" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "data_deletion_request" ADD CONSTRAINT "data_deletion_request_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;