# FM24 LNC Next.js Frontend (`fm24-lnc-fe`)

Frontend Next.js cho hệ thống quản lý dữ liệu file .LNC (Football Manager 2024).

## 1. Cài đặt

```bash
yarn install
# hoặc: npm install
```

## 2. Khởi chạy Local

Chạy nhanh bằng file batch:
```bat
run-local.bat
```

Hoặc qua command line:
```bash
yarn dev
# hoặc: npm run dev
```

Ứng dụng khởi chạy tại: `http://localhost:3002`

## 3. Cấu hình môi trường

Mặc định kết nối tới Java Backend tại `http://127.0.0.1:3001/api`.
Có thể điều chỉnh biến môi trường trong `.env.local` hoặc `.env.development`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api
```

