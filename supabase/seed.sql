-- Seed data for local development
-- Run after migration: supabase db reset

insert into public.products (name, price, stock, category, unit) values
  ('Beras Premium 5kg',   75000,  50, 'Sembako',   'karung'),
  ('Minyak Goreng 1L',    18000, 120, 'Sembako',   'botol'),
  ('Gula Pasir 1kg',      14500,  80, 'Sembako',   'kg'),
  ('Telur Ayam (papan)',  55000,  30, 'Sembako',   'papan'),
  ('Indomie Goreng',       3500, 200, 'Mie Instan','bungkus'),
  ('Sabun Mandi Lifebuoy', 5000,  60, 'Kebersihan','buah'),
  ('Shampoo Sunsilk 70ml',12000,  40, 'Kebersihan','botol'),
  ('Aqua 600ml',           4000, 150, 'Minuman',   'botol'),
  ('Teh Botol Sosro',      5500,  90, 'Minuman',   'botol'),
  ('Kopi Kapal Api 65g',   8000,  75, 'Minuman',   'sachet');
