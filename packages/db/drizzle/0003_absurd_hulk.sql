ALTER TABLE "accounts" ADD COLUMN "ai_provider" text DEFAULT 'claude' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "byok_key" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "brain_built_at" bigint;