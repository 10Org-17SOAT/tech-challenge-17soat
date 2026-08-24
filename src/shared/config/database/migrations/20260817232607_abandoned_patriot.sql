CREATE TYPE "public"."service_category" AS ENUM('mechanical', 'electrical', 'bodywork', 'painting', 'tire', 'glass', 'upholstery', 'air_conditioning', 'inspection', 'other');--> statement-breakpoint
CREATE TABLE "services" (
	"service_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" "service_category" NOT NULL,
	"price_in_cents" integer NOT NULL,
	"estimated_duration" integer,
	"warranty_days" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "services_name_active_unique" ON "services" USING btree ("name") WHERE "services"."deleted_at" is null;