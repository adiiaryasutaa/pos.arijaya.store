-- Seed data for local development
-- Safe to re-run: uses ON CONFLICT DO NOTHING on name
-- Usage:
--   pnpm db:reset   (wipes DB, runs migration + seed)
--   pnpm db:seed    (seed only, keeps existing data)

insert into public.products (name, price, stock, category, unit)
values
  ('Beras Premium 5kg',     75000,  50, 'Sembako',    'karung'),
  ('Minyak Goreng 1L',      18000, 120, 'Sembako',    'botol'),
  ('Gula Pasir 1kg',        14500,  80, 'Sembako',    'kg'),
  ('Telur Ayam (papan)',    55000,  30, 'Sembako',    'papan'),
  ('Garam Dapur 500g',       3000, 100, 'Sembako',    'bungkus'),
  ('Indomie Goreng',          3500, 200, 'Mie Instan', 'bungkus'),
  ('Indomie Soto',            3500, 150, 'Mie Instan', 'bungkus'),
  ('Sabun Mandi Lifebuoy',   5000,  60, 'Kebersihan', 'buah'),
  ('Shampo Sunsilk 70ml',   12000,  40, 'Kebersihan', 'botol'),
  ('Pasta Gigi Pepsodent',   8500,  55, 'Kebersihan', 'buah'),
  ('Aqua 600ml',              4000, 150, 'Minuman',    'botol'),
  ('Teh Botol Sosro',         5500,  90, 'Minuman',    'botol'),
  ('Kopi Kapal Api 65g',      8000,  75, 'Minuman',    'sachet'),
  ('Susu Ultra 250ml',        7500,  60, 'Minuman',    'kotak'),
  ('Roti Tawar Sari Roti',   15000,  35, 'Roti',       'bungkus'),
  ('Keripik Singkong',        8000,  45, 'Snack',      'bungkus'),
  ('Biskuit Roma Kelapa',     6500,  50, 'Snack',      'bungkus')
on conflict (name) do nothing;
