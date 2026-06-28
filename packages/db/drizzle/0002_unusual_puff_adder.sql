CREATE TABLE "account_access" (
	"account_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"granted_by" text,
	"created_at" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "account_access_account_id_user_id_pk" PRIMARY KEY("account_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"email" text NOT NULL,
	"kind" text NOT NULL,
	"org_id" text,
	"account_id" text,
	"role" text DEFAULT 'viewer' NOT NULL,
	"invited_by" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"accepted_user_id" text,
	"expires_at" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"invited_by" text,
	"created_at" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "org_members_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'individual' NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"created_by" text,
	"created_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "org_id" text;--> statement-breakpoint
ALTER TABLE "account_access" ADD CONSTRAINT "account_access_account_id_accounts_ig_user_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("ig_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_access_user" ON "account_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_invitations_email" ON "invitations" USING btree ("email","status");--> statement-breakpoint
CREATE INDEX "idx_org_members_user" ON "org_members" USING btree ("user_id");