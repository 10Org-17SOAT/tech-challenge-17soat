CREATE TABLE "customers" (
	"customer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_type" varchar(10) NOT NULL,
	"document" varchar(14) NOT NULL,
	"name" varchar(255),
	"corporate_name" varchar(255),
	"trade_name" varchar(255),
	"email" varchar(255) NOT NULL,
	"phone" jsonb NOT NULL,
	"address" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_document_active_unique" ON "customers" USING btree ("document") WHERE "customers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_deleted_at_idx" ON "customers" USING btree ("deleted_at");