-- Allow the same resource to appear multiple times in a price list (with different detail)
DROP INDEX IF EXISTS "price_list_items_price_list_id_resource_id_key";
