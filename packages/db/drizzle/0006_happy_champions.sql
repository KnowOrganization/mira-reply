CREATE TABLE "graph_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"src_node_id" text NOT NULL,
	"dst_node_id" text NOT NULL,
	"type" text NOT NULL,
	"directed" boolean DEFAULT true NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"source" text NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"last_reinforced_at" bigint
);
--> statement-breakpoint
CREATE TABLE "graph_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"type" text NOT NULL,
	"ref_table" text,
	"ref_id" text,
	"label" text NOT NULL,
	"subtype" text,
	"summary" text DEFAULT '' NOT NULL,
	"embedding" vector(768),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"account_id" text PRIMARY KEY NOT NULL,
	"one_liner" text DEFAULT '' NOT NULL,
	"graph_version" text DEFAULT '' NOT NULL,
	"generated_at" bigint,
	"model" text
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "location" jsonb;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "carousel" jsonb;--> statement-breakpoint
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_src_node_id_graph_nodes_id_fk" FOREIGN KEY ("src_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_dst_node_id_graph_nodes_id_fk" FOREIGN KEY ("dst_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_account_id_accounts_ig_user_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("ig_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_graph_edges_src" ON "graph_edges" USING btree ("account_id","src_node_id");--> statement-breakpoint
CREATE INDEX "idx_graph_edges_dst" ON "graph_edges" USING btree ("account_id","dst_node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_graph_edge" ON "graph_edges" USING btree ("account_id","src_node_id","dst_node_id","type");--> statement-breakpoint
CREATE INDEX "idx_graph_nodes_account_type" ON "graph_nodes" USING btree ("account_id","type");--> statement-breakpoint
CREATE INDEX "idx_graph_nodes_ref" ON "graph_nodes" USING btree ("ref_table","ref_id");