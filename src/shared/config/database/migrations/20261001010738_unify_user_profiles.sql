CREATE TABLE "roles" (
	"role_id" integer PRIMARY KEY NOT NULL,
	"name" varchar(32) NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "mechanic_availability" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"availability" varchar(16) NOT NULL,
	"available_since" timestamp with time zone NOT NULL,
	"current_service_order_id" varchar(255),
	CONSTRAINT "mechanic_availability_valid" CHECK ("mechanic_availability"."availability" in ('AVAILABLE', 'ALLOCATED', 'OFF_DUTY', 'INACTIVE'))
);
--> statement-breakpoint
ALTER TABLE "customers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "consultants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stock_keepers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mechanics" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_customer_id_customers_customer_id_fk";--> statement-breakpoint
DROP TABLE "customers" CASCADE;--> statement-breakpoint
DROP TABLE "consultants" CASCADE;--> statement-breakpoint
DROP TABLE "stock_keepers" CASCADE;--> statement-breakpoint
DROP TABLE "mechanics" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "document" varchar(14);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mechanic_availability" ADD CONSTRAINT "mechanic_availability_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mechanic_availability_fifo_idx" ON "mechanic_availability" USING btree ("availability","available_since");--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_id_users_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_document_active_unique" ON "users" USING btree ("document") WHERE "users"."document" IS NOT NULL AND "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "users_attributes_gin_idx" ON "users" USING gin ("attributes");