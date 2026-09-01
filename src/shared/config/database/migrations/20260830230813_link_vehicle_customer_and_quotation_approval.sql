ALTER TABLE "vehicles" ADD COLUMN "customer_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "vehicle_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "approval_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "approval_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "approval_email_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_id_customers_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vehicles_customer_id_idx" ON "vehicles" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "service_orders_vehicle_id_idx" ON "service_orders" USING btree ("vehicle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotations_approval_token_hash_unique" ON "quotations" USING btree ("approval_token_hash") WHERE "quotations"."approval_token_hash" IS NOT NULL;