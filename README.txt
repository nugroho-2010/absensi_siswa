ABSENSI SEKOLAH ONLINE
======================

Versi ini memakai Supabase untuk login dan database online, sehingga guru dan siswa dapat menggunakan perangkat berbeda.

Mulai dari panduan:
- Baca PANDUAN-SETUP.md.
- Jalankan supabase/schema.sql di Supabase SQL Editor.
- Isi js/supabase-config.js dengan URL dan publishable/anon key.
- Upload isi folder ini ke GitHub Pages.

Fitur:
- Login email/password untuk guru dan siswa.
- Guru mengelola kelas, data siswa, absensi, rekap, dan download Excel/CSV.
- Siswa melakukan check-in dan melihat riwayat sendiri.
- RLS membatasi data siswa dan absensi sesuai peran.
- Foto siswa memegang buku di luar kelas pada halaman login.

Penting:
- Jangan memasukkan service_role key ke website atau GitHub.
- Akun guru dibuat di Supabase Authentication lalu role-nya diubah melalui SQL sesuai panduan.
- File js/app-local-backup.js adalah backup versi LocalStorage lama dan tidak dipakai aplikasi online.
