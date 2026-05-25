# run_manage_spare_parts.ps1
# Usage: Open PowerShell in repo root and run: .\run_manage_spare_parts.ps1

$nodeScriptPath = Join-Path $PSScriptRoot 'manage_spare_parts_images.js'

$nodeScript = @'
const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const tmpDir = path.join(__dirname, 'tmp_images');
fs.ensureDirSync(tmpDir);

const BUCKET = 'spare-images';

const PARTS = [
  { id: '3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e01', name: 'High-Performance Brake Pads', category: 'Brakes', price: '$85.00', rating: 4.8, compatibility: 'Universal', imageUrl: 'https://images.unsplash.com/photo-1486006396143-3d2c81bdfc2b?auto=format&fit=crop&q=80&w=1200' },
  { id: '3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e02', name: 'All-Terrain Pro Tires', category: 'Tires', price: '$120.00', rating: 4.9, compatibility: 'All Vehicles', imageUrl: 'https://images.unsplash.com/photo-1541829070764-84a7d30dee62?auto=format&fit=crop&q=80&w=1200' },
  { id: '3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e03', name: 'SilverCell Super Battery', category: 'Electrical', price: '$210.00', rating: 4.7, compatibility: 'Most Cars', imageUrl: 'https://images.unsplash.com/photo-1619641151626-8312cb74039d?auto=format&fit=crop&q=80&w=1200' },
  { id: '3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e04', name: 'Premium Oil Filter', category: 'Engines', price: '$18.00', rating: 4.6, compatibility: 'Universal', imageUrl: 'https://images.unsplash.com/photo-1542365887-3f3b1f6f3b3d?auto=format&fit=crop&q=80&w=1200' },
  { id: '3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e05', name: 'Sport Brake Rotors', category: 'Brakes', price: '$145.00', rating: 4.8, compatibility: 'Sedans', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1200' },
  { id: '3b9f1a10-8c1e-4f3a-9d1b-1a2b3c4d5e06', name: 'Hydra Shock Absorber', category: 'Suspension', price: '$95.00', rating: 4.5, compatibility: 'Light Trucks', imageUrl: 'https://images.unsplash.com/photo-1541807084-5c52b6b4f5f8?auto=format&fit=crop&q=80&w=1200' },
];

async function ensureBucket() {
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: BUCKET, public: true })
  });
  if (res.status === 409) { console.log('Bucket already exists:', BUCKET); return; }
  if (!res.ok) { const t = await res.text(); throw new Error('Failed to create bucket: ' + res.status + ' ' + t); }
  console.log('Bucket created:', BUCKET);
}

async function deleteAllPartsAndImages() {
  const { data: allImages, error } = await supabase.from('storage_images').select('id,bucket,path,spare_part_id,shop_id');
  if (error) throw error;
  const byBucket = allImages.reduce((acc, it) => { acc[it.bucket] = acc[it.bucket] || []; acc[it.bucket].push(it.path); return acc; }, {});
  for (const bucketName of Object.keys(byBucket)) {
    const paths = byBucket[bucketName];
    console.log('Removing', paths.length, 'objects from', bucketName);
    const { error: remErr } = await supabase.storage.from(bucketName).remove(paths);
    if (remErr) console.warn('Error removing objects from', bucketName, remErr.message || remErr);
  }
  if (allImages.length) {
    const { error: delImgErr } = await supabase.from('storage_images').delete().neq('id', null);
    if (delImgErr) console.warn('Failed to delete storage_images rows:', delImgErr.message || delImgErr);
    else console.log('storage_images rows deleted.');
  }
  const { error: delPartsErr } = await supabase.from('spare_parts').delete().neq('id', null);
  if (delPartsErr) console.warn('Failed to delete spare_parts rows:', delPartsErr.message || delPartsErr);
  else console.log('All spare_parts removed.');
}

async function insertPartsAndUploadImages() {
  const partsToInsert = PARTS.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price, rating: p.rating, compatibility: p.compatibility }));
  const { error: insErr } = await supabase.from('spare_parts').insert(partsToInsert);
  if (insErr) throw insErr;
  console.log('Inserted spare_parts rows.');

  for (const p of PARTS) {
    const resp = await fetch(p.imageUrl);
    if (!resp.ok) { console.warn('Download failed for', p.imageUrl, resp.status); continue; }
    const buffer = await resp.buffer();
    const ext = (resp.headers.get('content-type') || 'image/jpeg').split('/').pop();
    const destPath = `spare_parts/${p.id}.${ext}`;
    const localFile = path.join(tmpDir, `${p.id}.${ext}`);
    await fs.writeFile(localFile, buffer);

    const uploadRes = await supabase.storage.from(BUCKET).upload(destPath, fs.createReadStream(localFile), { contentType: resp.headers.get('content-type') || 'image/jpeg', upsert: true });
    if (uploadRes.error) { console.warn('Upload error for', destPath, uploadRes.error.message || uploadRes.error); continue; }
    console.log('Uploaded', destPath);

    const publicUrl = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(destPath)}`;
    const { error: metaErr } = await supabase.from('storage_images').insert([{
      bucket: BUCKET, path: destPath, filename: path.basename(destPath),
      content_type: resp.headers.get('content-type') || 'image/jpeg', size: buffer.length,
      url: publicUrl, spare_part_id: p.id, is_public: true
    }]);
    if (metaErr) console.warn('Failed to insert storage_images for', p.id, metaErr.message || metaErr);
    else {
      const { data: insertedMeta } = await supabase.from('storage_images').select('id').eq('spare_part_id', p.id).limit(1).single();
      await supabase.from('spare_parts').update({ image: publicUrl, primary_image_id: insertedMeta.id }).eq('id', p.id);
      console.log('Linked image to part', p.id);
    }
    await fs.remove(localFile);
  }
}

(async function main() {
  try {
    console.log('Ensuring bucket exists...');
    await ensureBucket();
    console.log('Cleaning existing parts and images...');
    await deleteAllPartsAndImages();
    console.log('Inserting parts and uploading images...');
    await insertPartsAndUploadImages();
    console.log('Done. Temporary files at:', tmpDir);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
'@

# Write node script file
Set-Content -Path $nodeScriptPath -Value $nodeScript -Encoding UTF8
Write-Output "Wrote $nodeScriptPath"

# Install dependencies
Write-Output "Installing npm dependencies..."
npm install node-fetch@2 fs-extra @supabase/supabase-js

# Prompt for SUPABASE_URL and SERVICE_ROLE_KEY
$supabaseUrl = Read-Host "Enter SUPABASE_URL (e.g. https://<PROJECT_REF>.supabase.co)"
$secureKey = Read-Host -AsSecureString "Enter SERVICE_ROLE_KEY (will not echo)"
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
$serviceKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

# Set env vars for this session and run the node script
$env:SUPABASE_URL = $supabaseUrl
$env:SERVICE_ROLE_KEY = $serviceKey

Write-Output "Running the management script (this will create bucket, delete old parts/images, upload new ones)..."
node $nodeScriptPath

# Remove sensitive env var from session
Remove-Item Env:\SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
Write-Output "Finished. SERVICE_ROLE_KEY removed from session environment."
