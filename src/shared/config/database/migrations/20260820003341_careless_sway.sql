CREATE TABLE "stock_movements" (
	"movement_id" uuid PRIMARY KEY NOT NULL,
	"supply_id" uuid NOT NULL,
	"type" varchar(16) NOT NULL,
	"quantity" integer NOT NULL,
	"service_order_reference" varchar(255),
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "stock_movements_quantity_positive" CHECK ("stock_movements"."quantity" > 0),
	CONSTRAINT "stock_movements_type_valid" CHECK ("stock_movements"."type" in ('IN', 'RESERVE', 'CONSUME'))
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_supply_id_supplies_supply_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("supply_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_movements_supply_id_idx" ON "stock_movements" USING btree ("supply_id");