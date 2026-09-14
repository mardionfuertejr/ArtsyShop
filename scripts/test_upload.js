const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fqubsupqkorxfgohartk.supabase.co';
const supabaseKey = 'sb_publishable_fCYxAzMOcCTisJNWjC-2NA_VDR-IVbR';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  const fileName = `test-${Date.now()}.png`;
  const fileContent = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d0000000049454e44ae426082', 'hex');

  const { data, error } = await supabase.storage
    .from('product-photos')
    .upload(fileName, fileContent, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    console.error('Upload error:', error);
  } else {
    console.log('Upload successful:', data);
    const { data: pubData } = supabase.storage.from('product-photos').getPublicUrl(data.path);
    console.log('Public URL:', pubData.publicUrl);
    
    // Clean up test file
    await supabase.storage.from('product-photos').remove([data.path]);
    console.log('Cleaned up test file.');
  }
}

testUpload();
