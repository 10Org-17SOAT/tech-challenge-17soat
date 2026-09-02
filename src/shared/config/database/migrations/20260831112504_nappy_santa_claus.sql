ALTER TYPE "public"."service_order_status" ADD VALUE 'delivered';--> statement-breakpoint
CREATE TABLE "payments" (
	"payment_id" uuid PRIMARY KEY NOT NULL,
	"service_order_reference" uuid NOT NULL,
	"amount_in_cents" integer NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "payments_amount_in_cents_positive" CHECK ("payments"."amount_in_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_service_order_reference_unique" ON "payments" USING btree ("service_order_reference");