CREATE TABLE "consultants" (
	"consultant_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"cpf" varchar(11) NOT NULL,
	"phone" varchar(11) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "consultants_cpf_active_unique" ON "consultants" USING btree ("cpf") WHERE "consultants"."deleted_at" is null;