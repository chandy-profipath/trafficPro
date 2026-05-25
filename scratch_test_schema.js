const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://cogzxfxacftxjqhwpjgx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZ3p4ZnhhY2Z0eGpxaHdwamd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0OTA3MjksImV4cCI6MjA5NTA2NjcyOX0.qVIGZvrxa9A-ww7ptBKSZLox1VBM_6_a1cvM3BzKc9E";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { data: shops, error: shopsErr } = await supabase.from('shops').select('*').limit(1);
    console.log('Shops sample row:', shops, 'Error:', shopsErr);

    const { data: parts, error: partsErr } = await supabase.from('spare_parts').select('*').limit(1);
    console.log('Spare parts sample row:', parts, 'Error:', partsErr);
  } catch (e) {
    console.error('Catch error:', e);
  }
}

check();
