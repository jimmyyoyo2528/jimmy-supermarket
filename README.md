# Small Shop POS + Supabase

1. Create a Supabase project.
2. Run `supabase.sql` in SQL Editor.
3. Create an email/password user in Authentication > Users.
4. Copy Project URL and Publishable key (or legacy anon key) to `js/config.js`.
5. Commit and push all files to GitHub Pages.

Never put the service_role key in this repository.

## QR รับเงิน
1. รัน `supabase.sql` ใน Supabase SQL Editor เพื่อสร้าง `app_settings` และ bucket `payment-qr`.
2. เปิดหน้า Settings แล้วแนบรูป QR, ชื่อบัญชี และธนาคาร.
3. ที่หน้า POS เลือก โอน/QR เพื่อแสดง QR ให้ลูกค้าสแกน.
