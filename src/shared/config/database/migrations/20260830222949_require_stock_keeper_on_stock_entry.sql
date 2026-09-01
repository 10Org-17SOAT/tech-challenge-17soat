ALTER TABLE "stock_movements" ADD COLUMN "performed_by_id" uuid;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "performed_by_name" varchar(255);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_in_requires_performer" CHECK ("stock_movements"."type" <> 'IN' or "stock_movements"."performed_by_id" is not null);