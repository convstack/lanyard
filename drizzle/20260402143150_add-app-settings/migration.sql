CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY,
	"avatar_max_size_mb" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
