// One-off: apply ONLY the storefront-checkout additions from 0011 idempotently.
// The rest of 0011 already exists in the DB (added via db:push, uncaptured in
// migration files) — running the full migration would collide. Safe to re-run.
import { sql } from "@shaiz/db";

const stmts = [
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "price_minor" integer`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'INR' NOT NULL`,
  `CREATE TABLE IF NOT EXISTS "orders" (
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
  )`,
  `CREATE TABLE IF NOT EXISTS "order_items" (
    "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "order_id" text NOT NULL REFERENCES "orders"("id") ON DELETE cascade,
    "account_id" text NOT NULL,
    "product_id" text NOT NULL,
    "title_snapshot" text DEFAULT '' NOT NULL,
    "price_minor" integer NOT NULL,
    "qty" integer DEFAULT 1 NOT NULL,
    "variant_id" text,
    "variant_label" text
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_order_items_order" ON "order_items" USING btree ("order_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_orders_account_created" ON "orders" USING btree ("account_id","created_at")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_orders_rzp" ON "orders" USING btree ("razorpay_order_id")`,
];

for (const s of stmts) {
  await sql.unsafe(s);
  console.log("ok:", s.slice(0, 60).replace(/\s+/g, " "));
}
console.log("DONE");
await sql.end();
