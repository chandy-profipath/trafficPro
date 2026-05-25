-- supabase_spare_parts_simple.sql
-- Paste into Supabase SQL editor. This script deletes existing spare_parts rows
-- (destructive) and inserts mock spare parts where `image` contains the public
-- storage URL pointing to the `spare-images` bucket. Replace the project host
-- if different.

-- WARNING: This will DELETE all rows in `spare_parts`. Remove the DELETE line
-- if you do not want to wipe existing data.

-- Project storage host (your project)
-- Using value from your .env: https://cogzxfxacftxjqhwpjgx.supabase.co

-- 1) Delete existing spare parts (CAREFUL in production)
DELETE FROM spare_parts WHERE TRUE;

-- 2) Insert mock spare parts with image URLs pointing at the public storage path
INSERT INTO spare_parts (id, name, category, price, rating, compatibility, image, created_at)
VALUES
  ('3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e01','High-Performance Brake Pads','Brakes','$85.00',4.8,'Universal','https://cogzxfxacftxjqhwpjgx.supabase.co/storage/v1/object/public/spare-images/spare_parts/p1.jpg',now()),
  ('3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e02','All-Terrain Pro Tires','Tires','$120.00',4.9,'All Vehicles','https://cogzxfxacftxjqhwpjgx.supabase.co/storage/v1/object/public/spare-images/spare_parts/p2.jpg',now()),
  ('3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e03','SilverCell Super Battery','Electrical','$210.00',4.7,'Most Cars','https://cogzxfxacftxjqhwpjgx.supabase.co/storage/v1/object/public/spare-images/spare_parts/p3.jpg',now()),
  ('3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e04','Premium Oil Filter','Engines','$18.00',4.6,'Universal','https://cogzxfxacftxjqhwpjgx.supabase.co/storage/v1/object/public/spare-images/spare_parts/p4.jpg',now()),
  ('3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e05','Sport Brake Rotors','Brakes','$145.00',4.8,'Sedans','https://cogzxfxacftxjqhwpjgx.supabase.co/storage/v1/object/public/spare-images/spare_parts/p5.jpg',now()),
  ('3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e06','Hydra Shock Absorber','Suspension','$95.00',4.5,'Light Trucks','https://cogzxfxacftxjqhwpjgx.supabase.co/storage/v1/object/public/spare-images/spare_parts/p6.jpg',now())
ON CONFLICT DO NOTHING;

-- 3) Verify
SELECT id, name, image FROM spare_parts ORDER BY created_at DESC;

-- NOTES:
-- 1) You must upload the actual image files to the bucket `spare-images/spare_parts/...`
--    for these links to return images. To upload files, run the PowerShell runner
--    or the Node uploader previously provided, or use the Storage API/CLI.
-- 2) Example curl to upload a file (run locally, replace SERVICE_ROLE_KEY and PROJECT_REF):
-- curl -X POST "https://<PROJECT_REF>.supabase.co/storage/v1/object/spare-images" \
--   -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
--   -F "file=@/path/to/p1.jpg" \
--   -F "path=spare_parts/p1.jpg"

-- End of file
