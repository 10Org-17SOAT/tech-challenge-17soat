CREATE TYPE "public"."anamnesis_frequency" AS ENUM('constant', 'intermittent', 'rare');--> statement-breakpoint
CREATE TYPE "public"."anamnesis_how_started" AS ENUM('sudden', 'gradual', 'after_event');--> statement-breakpoint
CREATE TYPE "public"."anamnesis_severity" AS ENUM('light', 'moderate', 'severe');--> statement-breakpoint
CREATE TABLE "anamneses" (
	"anamnesis_id" uuid PRIMARY KEY NOT NULL,
	"service_order_id" uuid NOT NULL,
	"consultant_id" uuid NOT NULL,
	"updated_by" uuid,
	"main_complaint" text NOT NULL,
	"problem_description" text NOT NULL,
	"problem_started_at" text,
	"how_started" "anamnesis_how_started",
	"evolution" text,
	"occurrence_conditions" text,
	"frequency" "anamnesis_frequency",
	"severity" "anamnesis_severity",
	"previous_occurrences" text,
	"recent_maintenance" text,
	"warning_lights" boolean,
	"unusual_noises_smells" text,
	"behavior_changes" text,
	"usage_conditions" text,
	"customer_observations" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "anamneses_service_order_id_unique" UNIQUE("service_order_id")
);
--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "vehicle_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "anamneses" ADD CONSTRAINT "anamneses_service_order_id_service_orders_service_order_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("service_order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_anamneses_service_order_id" ON "anamneses" USING btree ("service_order_id");--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_vehicle_id_vehicles_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("vehicle_id") ON DELETE no action ON UPDATE no action;