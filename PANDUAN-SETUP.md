# Panduan setup Absensi Sekolah Online

Versi ini menggunakan **Supabase** sebagai login dan database online. GitHub Pages hanya menyajikan file website; data tersimpan di Supabase sehingga guru dan siswa dapat memakai perangkat berbeda.

## 1. Buat proyek Supabase

1. Buka [supabase.com](https://supabase.com), buat akun, lalu pilih **New project**.
2. Pilih organisasi, beri nama proyek, buat database password, dan pilih region yang paling dekat dengan sekolah.
3. Tunggu sampai proyek selesai dibuat.
4. Buka **SQL Editor > New query**.
5. Salin seluruh isi file `supabase/schema.sql` ke SQL Editor, lalu tekan **Run**.

File SQL membuat tabel pengguna, kelas, absensi, trigger profil, serta Row Level Security. Jangan menonaktifkan RLS.

## 2. Isi konfigurasi website

Buka `js/supabase-config.js` dan ganti:

```js
window.SUPABASE_URL = 'https://PROJECT-REF.supabase.co';
window.SUPABASE_ANON_KEY = 'PUBLISHABLE-KEY-ATAU-ANON-KEY';
```

Nilai tersebut ada di **Project Settings > API**. Gunakan hanya URL proyek dan publishable/anon key. **Jangan pernah memasukkan `service_role` key ke file website atau GitHub.**

## 3. Atur login email

Di Supabase buka **Authentication > Providers > Email** dan pastikan Email provider aktif. Untuk penggunaan sekolah, biarkan **Confirm email** aktif. Atur **Authentication > URL Configuration** setelah alamat GitHub Pages tersedia.

## 4. Buat akun guru

1. Buka **Authentication > Users > Add user**.
2. Masukkan email guru dan password sementara.
3. Salin UUID pengguna tersebut.
4. Jalankan SQL berikut di SQL Editor:

```sql
update public.profiles
set role = 'guru', full_name = 'Nama Guru'
where id = 'UUID-AKUN-GURU';
```

Jangan membuat akun guru melalui tombol **Daftar sebagai siswa**. Tombol itu hanya membuat akun siswa dengan role `siswa`.

## 5. Buat akun siswa dan masukkan ke kelas

Siswa dapat memakai tombol **Daftar sebagai siswa**. Setelah email dikonfirmasi, buat kelas melalui menu **Data siswa** menggunakan akun guru. Lalu buka **SQL Editor** dan masukkan NIS serta kelas siswa:

```sql
-- lihat daftar kelas dan salin id kelasnya
select id, name from public.classes order by name;

-- lihat profil siswa dan salin id siswa
select id, full_name, nis, role from public.profiles where role = 'siswa';

-- hubungkan siswa dengan kelas
update public.profiles
set nis = '2026001', class_id = 'UUID-KELAS'
where id = 'UUID-AKUN-SISWA';
```

Ulangi untuk setiap siswa. Untuk sekolah dengan banyak siswa, data dapat diimpor dari CSV melalui **Table Editor** Supabase setelah akun Auth siswa dibuat.

## 6. Deploy ke GitHub Pages

1. Buat repository GitHub baru, misalnya `absensi-sekolah`.
2. Upload isi folder `absensi-sekolah` ke repository. File `index.html` harus berada di root repository.
3. Buka **Settings > Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/ (root)`, lalu **Save**.
6. Tunggu workflow selesai. Alamatnya biasanya `https://USERNAME.github.io/NAMA-REPOSITORY/`.
7. Masukkan alamat tersebut ke Supabase **Authentication > URL Configuration > Site URL** dan **Redirect URLs**.

Contoh Redirect URL:

```text
https://USERNAME.github.io/NAMA-REPOSITORY/**
```

Setelah website aktif, buka alamat GitHub Pages dan uji login guru, pembuatan kelas, absensi, login siswa, check-in, dan Download Excel.

## Catatan keamanan dan operasional

- GitHub Pages bersifat publik. Keamanan data berasal dari Supabase Auth dan RLS di database.
- Data siswa hanya dapat dibaca oleh siswa sendiri atau guru. Guru dapat membaca dan mengubah absensi.
- Jangan commit password, `service_role` key, atau kredensial admin ke GitHub.
- Untuk pemakaian sekolah sungguhan, gunakan domain HTTPS, password unik, email sekolah, dan aktifkan backup database Supabase.
- File Download Excel pada versi browser ini menghasilkan CSV UTF-8 yang bisa langsung dibuka di Excel.

## Struktur file

- `index.html` — halaman aplikasi dan CDN library.
- `js/app.js` — login, dashboard guru/siswa, absensi, dan download Excel.
- `js/supabase-config.js` — URL dan publishable/anon key proyek Anda.
- `supabase/schema.sql` — tabel, trigger, grant, dan RLS policy.
- `assets/student-reading-outdoors.jpg` — foto halaman login.

## Referensi resmi

- [Supabase JavaScript initialization](https://supabase.com/docs/reference/javascript/initializing)
- [Supabase password-based Auth](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [GitHub Pages documentation](https://docs.github.com/en/pages)
