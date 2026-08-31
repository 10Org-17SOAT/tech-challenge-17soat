CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_plate" varchar(20) NOT NULL,
	"model" varchar(100) NOT NULL,
	"year" integer NOT NULL,
	"manufacturer" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(50) NOT NULL,
	"fuel_type" varchar(20) NOT NULL,
	"odometer" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_license_plate_unique" UNIQUE("license_plate")
);
--> statement-breakpoint
CREATE INDEX "idx_license_plate" ON "vehicles" USING btree ("license_plate");--> statement-breakpoint
CREATE INDEX "idx_status" ON "vehicles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_fuel_type" ON "vehicles" USING btree ("fuel_type");