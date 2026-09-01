ALTER TABLE "service_orders" ADD COLUMN "opened_by_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "opened_by_name" varchar(255) NOT NULL;