const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://upwumweuenpmuhiyxjcv.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjA0ODFmNzdjLWIwZDgtNDAzMy04ZmI5LWZmNTllNzc2MzhkNSJ9.eyJwcm9qZWN0SWQiOiJ1cHd1bXdldWVucG11aGl5eGpjdiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc2NTYyNTM4LCJleHAiOjIwOTE5MjI1MzgsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImZhbW91cy5jbGllbnRzIn0.zLz-JcnCGC8entpD3HHCKDziilVsBDOpo_Xuo-hMCog';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding data...');

  // 1. Shops (Mechanics & Suppliers)
  const { data: shops, error: shopsErr } = await supabase.from('shops').insert([
    { name: 'QuickFix Auto Care', type: 'Mechanic', rating: 4.8, reviews: 156, phone: '+263 77 111 2222', x: 35, y: 68 },
    { name: 'Global Parts Hub', type: 'Supplier', rating: 4.7, reviews: 89, phone: '+263 77 333 4444', x: 15, y: 80 },
    { name: 'Precision Brakes', type: 'Mechanic', rating: 4.9, reviews: 42, phone: '+263 77 555 6666', x: 70, y: 25 },
  ]).select();

  if (shopsErr) console.error('Shops error:', shopsErr.message);
  else console.log('Shops seeded');

  // 2. POIs (Fuel & Hotels)
  const { data: pois, error: poisErr } = await supabase.from('pois').insert([
    { kind: 'fuel', name: 'Shell Samora', brand: 'Shell', rating: 4.5, x: 22, y: 78 },
    { kind: 'fuel', name: 'TotalEnergies Avondale', brand: 'Total', rating: 4.3, x: 45, y: 55 },
    { kind: 'hotel', name: 'Roadside Lodge', rating: 4.2, x: 54, y: 44 },
  ]).select();

  if (poisErr) console.error('POIs error:', poisErr.message);
  else console.log('POIs seeded');

  // 3. Hazards
  const { error: hazErr } = await supabase.from('hazards').insert([
    { type: 'pothole', severity: 'high', title: 'Huge pothole after the bridge', note: 'Stay in the left lane', x: 30, y: 72, lat: -17.8248, lng: 31.0530, active: true },
    { type: 'debris', severity: 'medium', title: 'Tire debris on road', note: 'Scattered across two lanes', x: 46, y: 54, lat: -17.8300, lng: 31.0600, active: true },
    { type: 'speed_bump', severity: 'low', title: 'New unmarked bump', x: 62, y: 36, lat: -17.8400, lng: 31.0700, active: true },
  ]);

  if (hazErr) console.error('Hazards error:', hazErr.message);
  else console.log('Hazards seeded');

  // 4. Spare Parts
  const { error: partErr } = await supabase.from('spare_parts').insert([
    { name: 'Brake Pads - Premium', category: 'Brakes', price: '$85.00', rating: 4.8, compatibility: 'Universal' },
    { name: 'Castrol Edge 5W-30', category: 'Engines', price: '$45.00', rating: 4.9, compatibility: 'All Gasoline' },
    { name: 'Michelin Pilot Sport 4', category: 'Tires', price: '$180.00', rating: 5.0, compatibility: 'Sedans' },
  ]);

  if (partErr) console.error('Parts error:', partErr.message);
  else console.log('Parts seeded');

  console.log('Done!');
}

seed();
