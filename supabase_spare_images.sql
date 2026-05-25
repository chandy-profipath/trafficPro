-- supabase_spare_images.sql
-- Paste this entire file into the Supabase SQL editor and run.
-- It creates storage metadata, a deletion queue, RLS policies, triggers to link images to parts/shops,
-- and seed data for spare_parts and storage_images pointing to public picsum.photos images.
-- Note: creating the actual storage bucket still requires the Storage API/CLI (curl example at bottom).

-- Enable uuid extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) storage_images: metadata for uploaded objects
CREATE TABLE IF NOT EXISTS storage_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  url TEXT,
  filename TEXT,
  content_type TEXT,
  size INTEGER,
  metadata JSONB,
  spare_part_id UUID REFERENCES spare_parts(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  uploaded_by TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_images_spare_part ON storage_images(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_storage_images_shop ON storage_images(shop_id);
CREATE INDEX IF NOT EXISTS idx_storage_images_bucket_path ON storage_images(bucket, path);

-- 2) deletion_queue: external worker should poll this to remove objects from storage
CREATE TABLE IF NOT EXISTS deletion_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deletion_queue_unprocessed ON deletion_queue(processed) WHERE processed = false;

-- 3) Add primary_image_id to spare_parts and shops for convenience
ALTER TABLE spare_parts
  ADD COLUMN IF NOT EXISTS primary_image_id UUID REFERENCES storage_images(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_spare_parts_primary_image ON spare_parts(primary_image_id);

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS primary_image_id UUID REFERENCES storage_images(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_shops_primary_image ON shops(primary_image_id);

-- 4) Row Level Security: enable and simple public policies (adjust to your auth model)
ALTER TABLE IF EXISTS storage_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deletion_queue ENABLE ROW LEVEL SECURITY;

-- storage_images policies
CREATE POLICY "Public read storage_images" ON storage_images
  FOR SELECT USING (true);
CREATE POLICY "Public insert storage_images" ON storage_images
  FOR INSERT WITH CHECK (true);

-- deletion_queue policies (public insert allowed so server script/edge function can insert; SELECT limited)
CREATE POLICY "Insert deletion_queue" ON deletion_queue
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Select deletion_queue admins only" ON deletion_queue
  FOR SELECT USING (false);

-- 5) Trigger: after inserting a storage_images row, set the spare_parts.image or shops.image if linked
CREATE OR REPLACE FUNCTION trg_set_image_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.spare_part_id IS NOT NULL THEN
    UPDATE spare_parts
    SET primary_image_id = NEW.id,
        image = COALESCE(NEW.url, ('/storage/v1/object/public/' || NEW.bucket || '/' || NEW.path))
    WHERE id = NEW.spare_part_id;
  END IF;
  IF NEW.shop_id IS NOT NULL THEN
    UPDATE shops
    SET primary_image_id = NEW.id,
        image = COALESCE(NEW.url, ('/storage/v1/object/public/' || NEW.bucket || '/' || NEW.path))
    WHERE id = NEW.shop_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS storage_images_after_insert ON storage_images;
CREATE TRIGGER storage_images_after_insert
AFTER INSERT ON storage_images
FOR EACH ROW
EXECUTE FUNCTION trg_set_image_on_insert();

-- 6) Trigger: when a spare_part is deleted, queue its storage objects for deletion and remove metadata rows
CREATE OR REPLACE FUNCTION trg_queue_deletions_on_sparepart_delete()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT bucket, path FROM storage_images WHERE spare_part_id = OLD.id LOOP
    -- insert into deletion queue for external worker to remove the object from storage
    INSERT INTO deletion_queue (bucket, path) VALUES (r.bucket, r.path);
  END LOOP;

  -- remove storage_images metadata rows for this spare_part
  DELETE FROM storage_images WHERE spare_part_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS spare_parts_after_delete ON spare_parts;
CREATE TRIGGER spare_parts_after_delete
AFTER DELETE ON spare_parts
FOR EACH ROW
EXECUTE FUNCTION trg_queue_deletions_on_sparepart_delete();

-- 7) Optional: trigger to queue deletions when a storage_images row is deleted directly
CREATE OR REPLACE FUNCTION trg_queue_deletion_on_image_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deletion_queue (bucket, path) VALUES (OLD.bucket, OLD.path);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS storage_images_after_delete ON storage_images;
CREATE TRIGGER storage_images_after_delete
AFTER DELETE ON storage_images
FOR EACH ROW
EXECUTE FUNCTION trg_queue_deletion_on_image_delete();

-- 8) Seed data: remove existing spare_parts & storage_images entries (be careful in production)
-- Delete storage_images rows and spare_parts rows (using ids batch-safe deletion)
-- NOTE: This block is destructive. Remove or comment out if you do not want to wipe existing data.

-- Delete storage_images rows (all)
DELETE FROM storage_images WHERE TRUE;

-- Queue deletions for all objects previously stored (optional)
-- INSERT INTO deletion_queue (bucket, path)
-- SELECT bucket, path FROM storage_images;

-- Delete spare parts (all)
DELETE FROM spare_parts WHERE TRUE;

-- 9) Insert mock spare_parts with explicit UUIDs
INSERT INTO spare_parts (id, name, category, price, rating, compatibility, created_at)
VALUES
  ('3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e01','High-Performance Brake Pads','Brakes','$85.00',4.8,'Universal',now()),
  ('3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e02','All-Terrain Pro Tires','Tires','$120.00',4.9,'All Vehicles',now()),
  ('3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e03','SilverCell Super Battery','Electrical','$210.00',4.7,'Most Cars',now()),
  ('3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e04','Premium Oil Filter','Engines','$18.00',4.6,'Universal',now()),
  ('3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e05','Sport Brake Rotors','Brakes','$145.00',4.8,'Sedans',now()),
  ('3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e06','Hydra Shock Absorber','Suspension','$95.00',4.5,'Light Trucks',now());

-- 10) Insert storage_images metadata pointing to picsum public images (these do not require uploading files)
INSERT INTO storage_images (id, bucket, path, filename, content_type, size, url, spare_part_id, is_public, created_at)
VALUES
  ('b1111111-1111-4111-8111-111111111101','spare-images','spare_parts/3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e01.jpg','p1.jpg','image/jpeg',102400,'https://picsum.photos/seed/p1/1200/800','3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e01',true,now()),
  ('b1111111-1111-4111-8111-111111111102','spare-images','spare_parts/3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e02.jpg','p2.jpg','image/jpeg',153600,'https://picsum.photos/seed/p2/1200/800','3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e02',true,now()),
  ('b1111111-1111-4111-8111-111111111103','spare-images','spare_parts/3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e03.jpg','p3.jpg','image/jpeg',204800,'https://picsum.photos/seed/p3/1200/800','3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e03',true,now()),
  ('b1111111-1111-4111-8111-111111111104','spare-images','spare_parts/3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e04.jpg','p4.jpg','image/jpeg',61440,'https://picsum.photos/seed/p4/1200/800','3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e04',true,now()),
  ('b1111111-1111-4111-8111-111111111105','spare-images','spare_parts/3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e05.jpg','p5.jpg','image/jpeg',176000,'https://picsum.photos/seed/p5/1200/800','3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e05',true,now()),
  ('b1111111-1111-4111-8111-111111111106','spare-images','spare_parts/3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e06.jpg','p6.jpg','image/jpeg',142000,'https://picsum.photos/seed/p6/1200/800','3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e06',true,now());

-- 11) Ensure spare_parts.image populated (idempotent)
UPDATE spare_parts sp
SET image = ('/storage/v1/object/public/' || si.bucket || '/' || si.path),
    primary_image_id = si.id
FROM storage_images si
WHERE si.spare_part_id = sp.id AND (sp.image IS NULL OR sp.image = '');

-- 12) Quick verification select
SELECT sp.id, sp.name, sp.image, si.url AS storage_url
FROM spare_parts sp
LEFT JOIN storage_images si ON sp.primary_image_id = si.id
ORDER BY sp.created_at DESC;

-- 13) NOTES: create bucket (run outside SQL editor)
-- Create the public bucket (run in shell with your service role key):
-- curl -X POST "https://<PROJECT_REF>.supabase.co/storage/v1/bucket" \
--   -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
--   -H "Content-Type: application/json" \
--   -d '{"name":"spare-images","public":true}'

-- External worker: poll `deletion_queue` for rows where processed = false, delete objects via Storage API, then set processed = true and processed_at = now().
-- Example worker pseudocode:
-- SELECT id, bucket, path FROM deletion_queue WHERE processed = false LIMIT 20;
-- for each: DELETE object via Storage API; UPDATE deletion_queue SET processed=true, processed_at=now() WHERE id = <id>;

-- End of file
