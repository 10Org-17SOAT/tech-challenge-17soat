ALTER TABLE "users" ALTER COLUMN "user_id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultants" ADD CONSTRAINT "consultants_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_keepers" ADD CONSTRAINT "stock_keepers_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mechanics" ADD CONSTRAINT "mechanics_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_user_active_unique" ON "customers" USING btree ("user_id") WHERE "customers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "consultants_user_active_unique" ON "consultants" USING btree ("user_id") WHERE "consultants"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_keepers_user_active_unique" ON "stock_keepers" USING btree ("user_id") WHERE "stock_keepers"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "mechanics_user_active_unique" ON "mechanics" USING btree ("user_id") WHERE "mechanics"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "consultants" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_keepers" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "mechanics" ALTER COLUMN "user_id" SET NOT NULL;