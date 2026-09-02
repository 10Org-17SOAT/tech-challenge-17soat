CREATE TYPE "public"."service_order_status" AS ENUM('received', 'in_diagnosis', 'awaiting_approval', 'awaiting_execution', 'in_execution', 'finished');--> statement-breakpoint
CREATE TYPE "public"."quotation_item_kind" AS ENUM('labor', 'part');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('issued', 'approved');--> statement-breakpoint
CREATE TABLE "service_supplies" (
	"service_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "service_supplies_service_id_supply_id_pk" PRIMARY KEY("service_id","supply_id"),
	CONSTRAINT "service_supplies_quantity_positive" CHECK ("service_supplies"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "service_items" (
	"service_order_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "service_items_service_order_id_service_id_pk" PRIMARY KEY("service_order_id","service_id"),
	CONSTRAINT "service_items_quantity_positive" CHECK ("service_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "service_orders" (
	"service_order_id" uuid PRIMARY KEY NOT NULL,
	"status" "service_order_status" DEFAULT 'received' NOT NULL,
	"approved_by_customer" boolean DEFAULT false NOT NULL,
	"notes" text,
	"vehicle_mileage_at_entry" integer,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "diagnostics" (
	"diagnosis_id" uuid PRIMARY KEY NOT NULL,
	"service_order_id" uuid NOT NULL,
	"findings" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"quotation_item_id" uuid PRIMARY KEY NOT NULL,
	"quotation_id" uuid NOT NULL,
	"kind" "quotation_item_kind" NOT NULL,
	"reference_id" uuid NOT NULL,
	"name_snapshot" varchar(255) NOT NULL,
	"unit_price_in_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "quotation_items_quantity_positive" CHECK ("quotation_items"."quantity" > 0),
	CONSTRAINT "quotation_items_unit_price_non_negative" CHECK ("quotation_items"."unit_price_in_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"quotation_id" uuid PRIMARY KEY NOT NULL,
	"service_order_id" uuid NOT NULL,
	"status" "quotation_status" DEFAULT 'issued' NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "services" RENAME COLUMN "price_in_cents" TO "labor_price_in_cents";--> statement-breakpoint
ALTER TABLE "service_supplies" ADD CONSTRAINT "service_supplies_service_id_services_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("service_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_service_id_services_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("service_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_service_order_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("service_order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostics" ADD CONSTRAINT "diagnostics_service_order_id_service_orders_service_order_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("service_order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_quotation_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("quotation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_service_order_id_service_orders_service_order_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("service_order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diagnostics_service_order_id_idx" ON "diagnostics" USING btree ("service_order_id");--> statement-breakpoint
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotations_service_order_unique" ON "quotations" USING btree ("service_order_id");