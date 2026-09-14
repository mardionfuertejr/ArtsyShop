const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fqubsupqkorxfgohartk.supabase.co';
const supabaseKey = 'sb_publishable_fCYxAzMOcCTisJNWjC-2NA_VDR-IVbR';
const supabase = createClient(supabaseUrl, supabaseKey);

const connectionString = 'postgresql://postgres.fqubsupqkorxfgohartk:TpGNT8Nd2pnZoF47@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function migratePhotos() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to DB.');

  try {
    // 1. Ensure 'url' column exists on product_photos
    await client.query('ALTER TABLE public.product_photos ADD COLUMN IF NOT EXISTS url TEXT;');
    console.log('Verified column "url" on product_photos.');

    // 2. Fetch all products and photos from DB
    const productsRes = await client.query('SELECT * FROM products');
    const photosRes = await client.query('SELECT * FROM product_photos');

    console.log(`Found ${productsRes.rows.length} products and ${photosRes.rows.length} photos in database.`);

    for (const photo of photosRes.rows) {
      const storagePath = photo.storage_path || '';
      const url = photo.url || '';
      const rawTarget = storagePath.startsWith('data:') ? storagePath : (url.startsWith('data:') ? url : null);

      if (rawTarget && rawTarget.startsWith('data:image/')) {
        console.log(`Found Base64 photo for photo ID ${photo.id}, uploading to Supabase Storage...`);
        const matches = rawTarget.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

          const { data, error } = await supabase.storage
            .from('product-photos')
            .upload(fileName, buffer, {
              contentType: `image/${matches[1]}`,
              upsert: true,
            });

          if (!error && data) {
            const { data: pubData } = supabase.storage.from('product-photos').getPublicUrl(data.path);
            const publicUrl = pubData.publicUrl;
            console.log(`Uploaded! New Public URL: ${publicUrl}`);

            // Update database row
            await client.query(
              'UPDATE product_photos SET storage_path = $1, url = $2 WHERE id = $3',
              [data.path, publicUrl, photo.id]
            );
            console.log(`Updated photo row ${photo.id}.`);
          } else {
            console.error('Storage upload failed:', error);
          }
        }
      } else if (storagePath && !storagePath.startsWith('http') && !storagePath.startsWith('data:')) {
        // Already a storage path, populate public URL
        const { data: pubData } = supabase.storage.from('product-photos').getPublicUrl(storagePath);
        if (pubData?.publicUrl) {
          await client.query(
            'UPDATE product_photos SET url = $1 WHERE id = $2',
            [pubData.publicUrl, photo.id]
          );
          console.log(`Synced public URL for ${photo.id}: ${pubData.publicUrl}`);
        }
      } else if (storagePath.startsWith('http')) {
        // If it's an external URL, also ensure url column is filled
        await client.query(
          'UPDATE product_photos SET url = $1 WHERE id = $2',
          [storagePath, photo.id]
        );
      }
    }

    console.log('✅ All existing photos migrated and synced to Supabase Storage!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

migratePhotos();
