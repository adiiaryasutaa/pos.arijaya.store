# Struktur Database — POS Toko Arijaya

Dokumen ini menjelaskan struktur database (PostgreSQL via Supabase) untuk aplikasi kasir Toko Arijaya. Sumber kebenaran adalah file migrasi di `supabase/migrations/`. Semua tabel berada di skema `public`, kecuali `auth.users` yang dikelola oleh Supabase.

## Ringkasan Tabel

| Tabel | Fungsi |
|-------|--------|
| `products` | Daftar produk + stok |
| `transactions` | Header transaksi penjualan |
| `transaction_items` | Rincian item per transaksi (snapshot harga) |
| `store_config` | Pengaturan toko global (1 baris) |
| `user_preferences` | Preferensi tampilan per pengguna |
| `auth.users` | Akun login (dikelola Supabase) |

## Diagram Relasi

```
auth.users ──1:1── user_preferences
     │
     │ 1:N (user_id, ON DELETE SET NULL)
     ▼
transactions ──1:N (ON DELETE CASCADE)── transaction_items
                                              │
products ──1:N (product_id, ON DELETE SET NULL)┘
```

---

## Tabel `products`

Daftar produk dan stok. Boleh dibaca/ditulis oleh semua pengguna terautentikasi.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `name` | `text` | **NOT NULL**, **UNIK** |
| `price` | `numeric(15,2)` | NOT NULL, `CHECK (price >= 0)` |
| `stock` | `integer` | NOT NULL, default `0`, `CHECK (stock >= 0)` |
| `category` | `text` | Boleh kosong (nullable) |
| `unit` | `text` | NOT NULL, default `'pcs'` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()`, diperbarui otomatis oleh trigger |

- **Trigger:** `products_updated_at` — set `updated_at = now()` setiap `UPDATE`.
- **Realtime:** tabel ini dipublikasikan ke `supabase_realtime` agar badge stok ikut ter-update di semua kasir.

---

## Tabel `transactions`

Header transaksi penjualan. **Tidak ada jalur INSERT langsung dari client** — semua penjualan harus lewat fungsi `create_transaction` (lihat di bawah).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `payment_method` | `text` | NOT NULL, `CHECK (payment_method IN ('cash','transfer'))` |
| `total` | `numeric(15,2)` | NOT NULL, `CHECK (total >= 0)` — dihitung ulang di server |
| `amount_paid` | `numeric(15,2)` | Nullable, `CHECK (amount_paid >= 0)` — uang dibayar (tunai) |
| `change_amount` | `numeric(15,2)` | Nullable, `CHECK (change_amount >= 0)` — kembalian, dihitung server |
| `note` | `text` | Nullable |
| `user_id` | `uuid` | FK → `auth.users(id)` `ON DELETE SET NULL` — kasir pembuat |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

- **Index:** `idx_transactions_created_at` pada `created_at DESC`.
- `user_id` diisi dari `auth.uid()` di dalam fungsi RPC, bukan dari client.

---

## Tabel `transaction_items`

Rincian item per transaksi. Menyimpan **snapshot** nama dan harga produk saat transaksi, sehingga riwayat tetap akurat walau produk diubah/dihapus kemudian.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `transaction_id` | `uuid` | NOT NULL, FK → `transactions(id)` `ON DELETE CASCADE` |
| `product_id` | `uuid` | Nullable, FK → `products(id)` `ON DELETE SET NULL` |
| `product_name` | `text` | NOT NULL — snapshot nama |
| `product_price` | `numeric(15,2)` | NOT NULL — snapshot harga |
| `quantity` | `integer` | NOT NULL, `CHECK (quantity > 0)` |
| `subtotal` | `numeric(15,2)` | NOT NULL — dihitung ulang di server |

- **Index:** `idx_transaction_items_transaction_id` pada `transaction_id`.
- Sama seperti `transactions`: **tidak ada INSERT langsung dari client**.

---

## Tabel `store_config`

Pengaturan toko global. Tabel **satu baris** (selalu `id = 1`).

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | `int2` | Primary key, default `1`, `CHECK (id = 1)` |
| `store_name` | `text` | NOT NULL, default `'Toko Arijaya'` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()`, trigger otomatis |

- **Trigger:** `store_config_updated_at`.
- Baris tunggal di-seed otomatis saat migrasi (idempotent).

---

## Tabel `user_preferences`

Preferensi tampilan milik tiap pengguna.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `user_id` | `uuid` | Primary key, FK → `auth.users(id)` `ON DELETE CASCADE` |
| `font_size` | `text` | NOT NULL, default `'sedang'`, `CHECK (font_size IN ('kecil','sedang','besar'))` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()`, trigger otomatis |

- **Trigger:** `user_preferences_updated_at`.

---

## `auth.users` (dikelola Supabase)

Tabel akun login bawaan Supabase. Aplikasi tidak punya tabel `users` sendiri.

- **Peran (role):** disimpan di `app_metadata.role` dalam JWT. Nilai: `admin` atau `kasir`.
- `app_metadata` hanya bisa ditulis oleh service role, jadi pengguna tidak bisa menaikkan perannya sendiri.
- Manajemen pengguna (buat/ubah/hapus) lewat Admin API di server (`server/api/users/*`), bukan dari client.

---

## Fungsi (RPC)

### `create_transaction(p_payment_method text, p_items jsonb, p_amount_paid numeric default null) → jsonb`

Satu-satunya jalur pembuatan transaksi. **SECURITY DEFINER** dengan `search_path` terkunci.

Yang dilakukan secara atomik (gagal sebagian → rollback penuh):
1. Validasi `auth.uid()` tidak null (harus login).
2. Hitung ulang `total` dari `p_items` di server (harga × jumlah) — tidak percaya nilai client.
3. Hitung `change_amount = max(amount_paid − total, 0)` bila `p_amount_paid` diisi.
4. Insert header `transactions` dengan `user_id = auth.uid()`.
5. Insert tiap `transaction_items` (subtotal dihitung ulang) + kurangi stok produk secara atomik (`stock >= quantity`); bila stok kurang → `raise exception 'Stok tidak mencukupi...'`.
6. Kembalikan transaksi lengkap beserta item (JSON).

- **Hak akses:** `GRANT EXECUTE ... TO authenticated`.

---

## Ringkasan Row Level Security (RLS)

RLS aktif di semua tabel `public`.

| Tabel | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `products` | authenticated | authenticated | authenticated | authenticated |
| `transactions` | authenticated | **(tidak ada — via RPC)** | — | — |
| `transaction_items` | authenticated | **(tidak ada — via RPC)** | — | — |
| `store_config` | publik (siapa saja) | — | **hanya admin** (`app_metadata.role = 'admin'`) | — |
| `user_preferences` | pemilik (`auth.uid() = user_id`) | pemilik | pemilik | — |

Catatan:
- Policy INSERT langsung untuk `transactions` & `transaction_items` sengaja **di-drop** agar penjualan tidak bisa dipalsukan dari client — wajib lewat `create_transaction`.
- `store_config` boleh dibaca publik karena nama toko tampil di halaman login (sebelum autentikasi).

---

## Fungsi & Trigger Pembantu

- `handle_updated_at()` — fungsi trigger generik yang men-set `updated_at = now()`. Dipakai oleh `products`, `store_config`, dan `user_preferences`.

## Daftar Migrasi

| File | Isi |
|------|-----|
| `20260605000000_initial_schema.sql` | Tabel awal, index, RLS dasar |
| `20260606000000_create_transaction_rpc.sql` | Fungsi `create_transaction` v1 |
| `20260618000000_tighten_rls.sql` | Drop INSERT policy transaksi, hapus index duplikat |
| `20260618000100_add_payment_amounts.sql` | Tambah `amount_paid`, `change_amount` |
| `20260618000200_create_transaction_v2.sql` | `create_transaction` v2 (+ `p_amount_paid`) |
| `20260618000300_realtime_products.sql` | Publikasi realtime `products` |
| `20260619000000_settings_tables.sql` | Tabel `store_config` & `user_preferences` |
| `20260619000100_store_config_admin_policy.sql` | Batasi UPDATE `store_config` hanya admin |
