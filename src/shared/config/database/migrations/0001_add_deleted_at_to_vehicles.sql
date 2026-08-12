ALTER TABLE "vehicles" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX "idx_deleted_at" ON "vehicles" USING btree ("deleted_at");
