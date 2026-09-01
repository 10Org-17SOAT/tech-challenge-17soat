CREATE TABLE "stock_keepers" (
	"stock_keeper_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"cpf" varchar(11) NOT NULL,
	"phone" varchar(11) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "stock_keepers_cpf_active_unique" ON "stock_keepers" USING btree ("cpf") WHERE "stock_keepers"."deleted_at" is null;