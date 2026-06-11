CREATE TABLE "accounts" (
	"ig_user_id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"username" text DEFAULT '' NOT NULL,
	"access_token" text NOT NULL,
	"token_expires_at" bigint DEFAULT 0 NOT NULL,
	"connected_at" bigint DEFAULT 0 NOT NULL,
	"last_token" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"owner_profile" jsonb,
	"style_samples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tone_summary" text DEFAULT '' NOT NULL,
	"blocklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trusted_contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fingerprints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"follower_cache" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"send_queue" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"poll_watermark" bigint DEFAULT 0 NOT NULL,
	"dm_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"post_dms_sent" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dm_blocked" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"link_pending" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"name" text DEFAULT 'Untitled' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"trigger" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clarifications" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"comment_id" text,
	"post_id" text DEFAULT '' NOT NULL,
	"comment_text" text DEFAULT '' NOT NULL,
	"question" text DEFAULT '' NOT NULL,
	"kind" text,
	"draft_attempt" text,
	"from_user_id" text DEFAULT '' NOT NULL,
	"from_username" text,
	"status" text DEFAULT 'open' NOT NULL,
	"answer" text,
	"waiters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commenters" (
	"account_id" text NOT NULL,
	"ig_user_id" text NOT NULL,
	"username" text DEFAULT '' NOT NULL,
	"first_seen_at" bigint DEFAULT 0 NOT NULL,
	"last_seen_at" bigint DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"replied_count" integer DEFAULT 0 NOT NULL,
	"themes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "commenters_account_id_ig_user_id_pk" PRIMARY KEY("account_id","ig_user_id")
);
--> statement-breakpoint
CREATE TABLE "comments_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"post_id" text NOT NULL,
	"post_caption" text DEFAULT '' NOT NULL,
	"post_thumb" text,
	"post_permalink" text,
	"text" text DEFAULT '' NOT NULL,
	"from_user_id" text DEFAULT '' NOT NULL,
	"from_username" text DEFAULT '' NOT NULL,
	"timestamp" text DEFAULT '' NOT NULL,
	"ts" bigint DEFAULT 0 NOT NULL,
	"is_own" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"account_id" text NOT NULL,
	"date" text NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"auto_replied" integer DEFAULT 0 NOT NULL,
	"drafted" integer DEFAULT 0 NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"dm_sent" integer DEFAULT 0 NOT NULL,
	"facts_learned" integer DEFAULT 0 NOT NULL,
	"clarifications_resolved" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_stats_account_id_date_pk" PRIMARY KEY("account_id","date")
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"thread_or_media_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"from_username" text,
	"inbound_text" text DEFAULT '' NOT NULL,
	"draft_text" text DEFAULT '' NOT NULL,
	"dm_text" text,
	"intent" text DEFAULT '' NOT NULL,
	"post_id" text,
	"created_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "feed_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ts" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"comment_id" text,
	"inbound" text DEFAULT '' NOT NULL,
	"outbound" text DEFAULT '' NOT NULL,
	"intent" text DEFAULT '' NOT NULL,
	"post_id" text,
	"to_user_id" text,
	"sent_at" bigint DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "knowledge" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"topic" text DEFAULT 'general' NOT NULL,
	"scope" text DEFAULT 'account' NOT NULL,
	"post_id" text,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"embedding" jsonb,
	"link" jsonb,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"durable" boolean DEFAULT true NOT NULL,
	"expires_at" bigint,
	"source_comment_id" text,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL,
	"last_used_at" bigint
);
--> statement-breakpoint
CREATE TABLE "mentions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"media_id" text NOT NULL,
	"permalink" text,
	"thumbnail_url" text,
	"media_url" text,
	"media_caption" text,
	"comment_id" text,
	"comment_text" text,
	"from_user_id" text,
	"from_username" text,
	"media_type" text,
	"like_count" integer,
	"comments_count" integer,
	"ts" bigint DEFAULT 0 NOT NULL,
	"seen_at" bigint DEFAULT 0 NOT NULL,
	"read" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_log" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"direction" text NOT NULL,
	"event_type" text NOT NULL,
	"igsid" text,
	"post_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text,
	"error" text,
	"created_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_resume" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pending_resume_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"from_user_id" text NOT NULL,
	"from_username" text,
	"comment_id" text,
	"automation_id" text NOT NULL,
	"remaining_node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"not_before" bigint DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"ts" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"ig_post_id" text NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"welcome_msg" text DEFAULT '' NOT NULL,
	"button_label" text DEFAULT 'Send me the link 👇' NOT NULL,
	"follow_gate" boolean DEFAULT true NOT NULL,
	"not_following_msg" text DEFAULT '' NOT NULL,
	"link_url" text,
	"link_msg" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"media_type" text DEFAULT '' NOT NULL,
	"permalink" text,
	"thumbnail_url" text,
	"timestamp" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"qa" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"insights" jsonb,
	"updated_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_comments" (
	"comment_id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"igsid" text NOT NULL,
	"post_id" text NOT NULL,
	"replied_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"mira_action" text DEFAULT '' NOT NULL,
	"mira_reply" text DEFAULT '' NOT NULL,
	"intent" text DEFAULT '' NOT NULL,
	"verdict" text DEFAULT 'good' NOT NULL,
	"correct_action" text,
	"ideal_reply" text,
	"ask_question" text,
	"note" text,
	"embedding" jsonb,
	"created_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_states" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"igsid" text NOT NULL,
	"post_id" text NOT NULL,
	"comment_id" text NOT NULL,
	"state" text NOT NULL,
	"payload" jsonb,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "webhook_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"account_id" text NOT NULL,
	"field" text NOT NULL,
	"event_key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" bigint DEFAULT 0 NOT NULL,
	"processed_at" bigint,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_account_id_accounts_ig_user_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("ig_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_automations_account" ON "automations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_clarifications_account" ON "clarifications" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_comments_cache_account_ts" ON "comments_cache" USING btree ("account_id","ts");--> statement-breakpoint
CREATE INDEX "idx_drafts_account" ON "drafts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_feed_account_ts" ON "feed_events" USING btree ("account_id","ts");--> statement-breakpoint
CREATE INDEX "idx_history_account_sent" ON "history" USING btree ("account_id","sent_at");--> statement-breakpoint
CREATE INDEX "idx_history_comment" ON "history" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_account" ON "knowledge" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_scope_post" ON "knowledge" USING btree ("account_id","scope","post_id");--> statement-breakpoint
CREATE INDEX "idx_mentions_account_ts" ON "mentions" USING btree ("account_id","ts");--> statement-breakpoint
CREATE INDEX "idx_message_log_created" ON "message_log" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_message_log_igsid" ON "message_log" USING btree ("igsid");--> statement-breakpoint
CREATE INDEX "idx_pending_user" ON "pending_resume" USING btree ("account_id","from_user_id");--> statement-breakpoint
CREATE INDEX "idx_pending_kind" ON "pending_resume" USING btree ("account_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_post_configs_post" ON "post_configs" USING btree ("account_id","ig_post_id");--> statement-breakpoint
CREATE INDEX "idx_posts_account" ON "posts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_training_account" ON "training" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_states" ON "user_states" USING btree ("igsid","post_id");--> statement-breakpoint
CREATE INDEX "idx_user_states_igsid" ON "user_states" USING btree ("igsid");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_webhook_events_key" ON "webhook_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_account" ON "webhook_events" USING btree ("account_id","received_at");