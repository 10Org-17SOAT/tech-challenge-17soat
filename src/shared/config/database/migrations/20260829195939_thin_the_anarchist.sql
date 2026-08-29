CREATE TABLE "mechanics" (
	"mechanic_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"cpf" varchar(11) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" jsonb NOT NULL,
	"specialties" jsonb NOT NULL,
	"hire_date" timestamp with time zone NOT NULL,
	"availability" varchar(16) NOT NULL,
	"available_since" timestamp with time zone NOT NULL,
	"current_service_order_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "mechanics_availability_valid" CHECK ("mechanics"."availability" in ('AVAILABLE', 'ALLOCATED', 'OFF_DUTY', 'INACTIVE'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mechanics_cpf_active_unique" ON "mechanics" USING btree ("cpf") WHERE "mechanics"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "mechanics_availability_available_since_idx" ON "mechanics" USING btree ("availability","available_since");--> statement-breakpoint
CREATE INDEX "mechanics_deleted_at_idx" ON "mechanics" USING btree ("deleted_at");