ALTER TYPE "public"."quotation_status" ADD VALUE 'rejected';--> statement-breakpoint
DROP INDEX "quotations_service_order_unique";--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "rejection_reason" varchar(500);--> statement-breakpoint
CREATE UNIQUE INDEX "quotations_service_order_unique" ON "quotations" USING btree ("service_order_id") WHERE "quotations"."rejected_at" IS NULL;