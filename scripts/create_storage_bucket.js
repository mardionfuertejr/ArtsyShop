const { Client } = require('pg');

const connectionStrings = [
  'postgresql://postgres.fqubsupqkorxfgohartk:TpGNT8Nd2pnZoF47@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres.fqubsupqkorxfgohartk:TpGNT8Nd2pnZoF47@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  'postgresql://postgres:TpGNT8Nd2pnZoF47@db.fqubsupqkorxfgohartk.supabase.co:5432/postgres'
];

async function createBucket() {
  let client = null;
  let connected = false;

  for (const connStr of connectionStrings) {
    try {
      console.log('Connecting to database...');
      client = new Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });
      await client.connect();
      connected = true;
      console.log('Connected successfully!');
      break;
    } catch (err) {
      console.warn('Connection attempt failed, trying next...');
    }
  }

  if (!connected || !client) {
    console.error('Could not connect to database with available connection strings.');
    process.exit(1);
  }

  try {
    console.log('Creating storage bucket product-photos...');
    await client.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'product-photos',
        'product-photos',
        true,
        52428800,
        ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif', 'image/jpg']
      )
      ON CONFLICT (id) DO UPDATE SET
        public = true,
        allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif', 'image/jpg'];
    `);

    console.log('Configuring Storage RLS Policies...');

    // Public SELECT
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for product-photos'
        ) THEN
          CREATE POLICY "Public Access for product-photos" ON storage.objects FOR SELECT USING (bucket_id = 'product-photos');
        END IF;
      END $$;
    `);

    // Allow INSERT
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Uploads for product-photos'
        ) THEN
          CREATE POLICY "Allow Uploads for product-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-photos');
        END IF;
      END $$;
    `);

    // Allow UPDATE
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Updates for product-photos'
        ) THEN
          CREATE POLICY "Allow Updates for product-photos" ON storage.objects FOR UPDATE USING (bucket_id = 'product-photos');
        END IF;
      END $$;
    `);

    // Allow DELETE
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Deletes for product-photos'
        ) THEN
          CREATE POLICY "Allow Deletes for product-photos" ON storage.objects FOR DELETE USING (bucket_id = 'product-photos');
        END IF;
      END $$;
    `);

    console.log('✅ Bucket "product-photos" created and configured as PUBLIC successfully!');
  } catch (err) {
    console.error('Error creating bucket:', err);
  } finally {
    await client.end();
  }
}

createBucket();
