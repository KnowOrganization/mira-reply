CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"igsid" text NOT NULL,
	"username" text,
	"last_inbound_at" bigint DEFAULT 0 NOT NULL,
	"last_outbound_at" bigint DEFAULT 0 NOT NULL,
	"window_expires_at" bigint DEFAULT 0 NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"account_id" text NOT NULL,
	"direction" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"sent_by" text DEFAULT 'user' NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_text" text,
	"image_url" text,
	"cta_url" text,
	"available" boolean DEFAULT true NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"embedding" jsonb,
	"slug" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "onboarding_step" text DEFAULT 'connect' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "onboarding_skipped_at" bigint;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_conversations_acct_igsid" ON "conversations" USING btree ("account_id","igsid");--> statement-breakpoint
CREATE INDEX "idx_conversations_account" ON "conversations" USING btree ("account_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_products_account" ON "products" USING btree ("account_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_products_available" ON "products" USING btree ("account_id","available");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_products_slug" ON "products" USING btree ("account_id","slug");