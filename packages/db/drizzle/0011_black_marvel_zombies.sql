CREATE TABLE "ab_assignments" (
	"account_id" text NOT NULL,
	"automation_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"variant" integer NOT NULL,
	"converted" boolean DEFAULT false NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "ab_assignments_automation_id_from_user_id_pk" PRIMARY KEY("automation_id","from_user_id")
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discount_codes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"account_id" text NOT NULL,
	"automation_id" text NOT NULL,
	"code" text NOT NULL,
	"issued_to" text NOT NULL,
	"issued_to_username" text,
	"redeemed_at" bigint,
	"created_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_entries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "funnel_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"account_id" text NOT NULL,
	"automation_id" text NOT NULL,
	"entry_number" integer NOT NULL,
	"from_user_id" text NOT NULL,
	"from_username" text,
	"won" boolean DEFAULT false NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "moderation_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"account_id" text NOT NULL,
	"comment_id" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"from_user_id" text DEFAULT '' NOT NULL,
	"from_username" text,
	"rule_type" text DEFAULT '' NOT NULL,
	"action" text DEFAULT 'flag' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"ts" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"type" text NOT NULL,
	"pattern" text DEFAULT '' NOT NULL,
	"action" text DEFAULT 'flag' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" text NOT NULL,
	"account_id" text NOT NULL,
	"product_id" text NOT NULL,
	"title_snapshot" text DEFAULT '' NOT NULL,
	"price_minor" integer NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"variant_id" text,
	"variant_label" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"amount_total" integer NOT NULL,
	"email" text,
	"customer_name" text,
	"shipping" jsonb,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL,
	"paid_at" bigint
);
--> statement-breakpoint
CREATE TABLE "product_interest" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_interest_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"account_id" text NOT NULL,
	"product_id" text NOT NULL,
	"igsid" text NOT NULL,
	"username" text,
	"notified_at" bigint,
	"created_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"image_url" text,
	"video_url" text,
	"media_type" text DEFAULT 'IMAGE' NOT NULL,
	"scheduled_at" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"media_id" text,
	"error" text,
	"created_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "ice_breakers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "persistent_menu" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_minor" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "currency" text DEFAULT 'INR' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "images" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variants" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ab_assignments_automation" ON "ab_assignments" USING btree ("account_id","automation_id");--> statement-breakpoint
CREATE INDEX "idx_discount_codes_automation" ON "discount_codes" USING btree ("account_id","automation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_discount_codes_code" ON "discount_codes" USING btree ("automation_id","code");--> statement-breakpoint
CREATE INDEX "idx_funnel_entries_automation" ON "funnel_entries" USING btree ("account_id","automation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_funnel_entries_user" ON "funnel_entries" USING btree ("automation_id","from_user_id");--> statement-breakpoint
CREATE INDEX "idx_modlog_account_ts" ON "moderation_log" USING btree ("account_id","ts");--> statement-breakpoint
CREATE INDEX "idx_modrules_account" ON "moderation_rules" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_account_created" ON "orders" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_orders_rzp" ON "orders" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_interest" ON "product_interest" USING btree ("product_id","igsid");--> statement-breakpoint
CREATE INDEX "idx_product_interest_account" ON "product_interest" USING btree ("account_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_posts_account" ON "scheduled_posts" USING btree ("account_id","scheduled_at");