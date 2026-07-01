ALTER TABLE "accounts" ADD COLUMN "ig_scoped_user_id" text;--> statement-breakpoint
CREATE INDEX "idx_accounts_ig_scoped_user_id" ON "accounts" USING btree ("ig_scoped_user_id");