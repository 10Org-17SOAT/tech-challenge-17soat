CREATE TYPE "public"."order_status" AS ENUM('received', 'in_diagnosis', 'awaiting_approval', 'awaiting_execution', 'in_execution', 'finished');--> statement-breakpoint
CREATE TABLE "orders" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"status" "order_status" DEFAULT 'received' NOT NULL,
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
