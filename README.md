# FM24 LNC Manager (`fm24-lnc`)

Dự án quản lý và chỉnh sửa dữ liệu file `.LNC` (Language/Name Change) cho Football Manager 2024 (by Thudd).

Source code được tổ chức thành 2 nhánh / phân hệ độc lập:

```text
fm24-lnc/
├── fm24-lnc-be/      # Backend Java 21 / Spring Boot 3.3 (Cổng 3001, Swagger: /docs)
└── fm24-lnc-fe/      # Frontend Next.js 14 / React 18 / Ant Design (Cổng 3002)
```

---

## 1. Khởi Chạy Nhanh

### Backend (Java Spring Boot)
1. Đảm bảo PostgreSQL đang chạy và có database `fm_lnc_db`.
2. Vào thư mục `fm24-lnc-be` và chạy:
   ```bat
   run-local.bat
   ```
   Hoặc bằng lệnh:
   ```powershell
   mvn spring-boot:run
   ```
* Backend API: `http://localhost:3001`
* Swagger UI: `http://localhost:3001/docs`

### Frontend (Next.js)
1. Cài đặt dependencies (lần đầu):
   ```powershell
   cd fm24-lnc-fe
   yarn install
   ```
2. Khởi chạy:
   ```bat
   run-local.bat
   ```
   Hoặc bằng lệnh:
   ```powershell
   yarn dev
   ```
* Frontend Web: `http://localhost:3002`

---

## 2. Điểm Nổi Bật Kiến Trúc

- **Backend Độc Lập**: Toàn bộ logic LNC parse/export, hierarchy, search đa bảng song song với Java 21 Virtual Threads, CRUD entity.
- **Frontend Độc Lập**: Giao diện trực quan xem cấu trúc giải đấu (Tree View), tìm kiếm toàn văn, chỉnh sửa tên CLB/Giải đấu/Quốc gia/Sân vận động, import/export trực tiếp file `.lnc`.
- **Dễ Dàng Triển Khai**: Mỗi nhánh có thể build độc lập thành container Docker, deploy lên Render/Railway (Backend) hoặc Vercel (Frontend) mà không cần cấu hình monorepo phức tạp.

