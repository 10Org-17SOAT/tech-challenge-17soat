ALTER TABLE orders RENAME TO service_orders;
ALTER TABLE service_orders RENAME COLUMN order_id TO service_order_id;
ALTER TYPE order_status RENAME TO service_order_status;
