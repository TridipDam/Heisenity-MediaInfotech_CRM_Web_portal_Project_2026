-- Clean up duplicate products and reset the database
-- Run this in your PostgreSQL database

-- First, let's see what products exist
SELECT id, sku, product_name, created_at FROM products ORDER BY created_at;

-- Delete all products to start fresh (be careful with this!)
-- DELETE FROM barcodes; -- Delete related barcodes first
-- DELETE FROM products; -- Then delete products

-- Or if you want to keep some products, delete only duplicates:
-- This query will show duplicates:
SELECT sku, COUNT(*) as count 
FROM products 
GROUP BY sku 
HAVING COUNT(*) > 1;

-- To delete duplicates (keeping the oldest one for each SKU):
-- DELETE FROM products 
-- WHERE id NOT IN (
--     SELECT MIN(id) 
--     FROM products 
--     GROUP BY sku
-- );

-- Reset the sequence if you deleted all products:
-- ALTER SEQUENCE products_id_seq RESTART WITH 1;