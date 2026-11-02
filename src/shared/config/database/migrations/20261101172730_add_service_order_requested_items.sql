CREATE TABLE "service_order_requested_parts" (
	"service_order_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "requested_parts_pk" PRIMARY KEY("service_order_id","supply_id"),
	CONSTRAINT "requested_parts_quantity_positive" CHECK ("service_order_requested_parts"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "service_order_requested_services" (
	"service_order_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "requested_services_pk" PRIMARY KEY("service_order_id","service_id"),
	CONSTRAINT "requested_services_quantity_positive" CHECK ("service_order_requested_services"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "service_order_requested_parts" ADD CONSTRAINT "requested_parts_service_order_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("service_order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order_requested_services" ADD CONSTRAINT "requested_services_service_order_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("service_order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order_requested_services" ADD CONSTRAINT "requested_services_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("service_id") ON DELETE no action ON UPDATE no action;