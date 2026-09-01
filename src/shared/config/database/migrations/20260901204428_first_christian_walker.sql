CREATE INDEX "customers_user_id_idx" ON "customers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mechanics_user_id_idx" ON "mechanics" USING btree ("user_id");