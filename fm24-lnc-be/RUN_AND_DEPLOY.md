# Hướng dẫn chạy và triển khai FM24 LNC Java Backend

Backend sử dụng Java 21, Spring Boot 3, PostgreSQL và chạy mặc định tại cổng `3001`.

## 1. Yêu cầu

- Java Development Kit 21.
- Maven 3.9+ hoặc Docker.
- PostgreSQL đang hoạt động và có database `fm_lnc_db`.
- Ba file dữ liệu trong thư mục `data`:
  - `fm24_club.lnc`
  - `fm24_competition_other.lnc`
  - `fm24_geography.lnc`

## 2. Biến môi trường

| Biến | Mặc định | Mô tả |
| --- | --- | --- |
| `PORT` | `3001` | Cổng HTTP của backend |
| `HOST` | `0.0.0.0` | Địa chỉ bind server |
| `DB_HOST` | `127.0.0.1` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | `123456` | PostgreSQL password |
| `DB_NAME` | `fm_lnc_db` | Tên database |
| `LNC_FILES_DIR` | `./data` | Thư mục chứa ba file `.lnc` |
| `CONFED_LOGO_DIR` | rỗng | Thư mục logo confederation |
| `NATION_LOGO_DIR` | rỗng | Thư mục logo nation |
| `COMP_LOGO_DIR` | rỗng | Thư mục logo competition |
| `CLUB_LOGO_DIR` | rỗng | Thư mục logo club |

Không ghi password production trực tiếp vào source code hoặc file được commit.

## 3. Chạy local bằng Maven

PowerShell:

```powershell
cd D:\Games\thudd\fm24-lnc\fm24-lnc-be

$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '5432'
$env:DB_USERNAME = 'postgres'
$env:DB_PASSWORD = 'your-password'
$env:DB_NAME = 'fm_lnc_db'
$env:LNC_FILES_DIR = (Resolve-Path '.\data').Path

mvn clean package
java -jar .\target\fm24-lnc-be-1.0.0.jar
```

Chạy trực tiếp bằng Spring Boot khi phát triển:

```powershell
mvn spring-boot:run
```

### Tự reload khi sửa code Java

Project có `spring-boot-devtools` và workspace bật `java.autobuild.enabled`.
Giữ `run-local.bat` đang chạy, sau đó lưu file `.java` trong VS Code. Java extension sẽ compile thay đổi và Spring Boot tự restart application context; không cần đóng terminal hay chạy lại file `.bat`.

Nếu lưu file nhưng không thấy dòng `Restarting` trong terminal:

1. Nhấn `Ctrl+Shift+P`.
2. Chạy **Java: Clean Java Language Server Workspace**.
3. Chọn **Restart and delete**.
4. Chạy lại `run-local.bat` một lần duy nhất.

## 4. Chạy local bằng Docker

Build image:

```powershell
docker build -t fm24-lnc-be .
```

Chạy container và kết nối PostgreSQL trên máy host:

```powershell
docker run --rm --name fm24-lnc-be `
  -p 3001:3001 `
  -e DB_HOST=host.docker.internal `
  -e DB_PORT=5432 `
  -e DB_USERNAME=postgres `
  -e DB_PASSWORD=your-password `
  -e DB_NAME=fm_lnc_db `
  -e LNC_FILES_DIR=/app/data `
  fm24-lnc-be
```

Docker image tự động copy đúng ba file trong `data` vào `/app/data`.

## 5. Kiểm tra sau khi chạy

```powershell
Invoke-RestMethod http://localhost:3001/health
Invoke-RestMethod http://localhost:3001/api/lnc/status
```

Các URL quan trọng:

- Health: `http://localhost:3001/health`
- Swagger UI: `http://localhost:3001/docs`
- OpenAPI JSON: `http://localhost:3001/api/docs`
- LNC status: `http://localhost:3001/api/lnc/status`
- Public LNC files: `http://localhost:3001/api/lnc/files/{fileName}`
- Unit Tree: `http://localhost:3001/api/hierarchy/unit-tree?type=nation`

## 6. Đồng bộ database từ ba file trên server

Import các file hiện có trong `LNC_FILES_DIR`:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3001/api/lnc/import `
  -Method Post `
  -ContentType 'application/json' `
  -Body '{}'
```

Quá trình import chạy trong transaction. Nếu có lỗi, toàn bộ thay đổi của lần import sẽ rollback.

Upload phiên bản mới của ba file và tự động sync database:

```json
POST /api/lnc/upload
Content-Type: application/json

{
  "files": [
    { "name": "fm24_club.lnc", "content": "..." },
    { "name": "fm24_competition_other.lnc", "content": "..." },
    { "name": "fm24_geography.lnc", "content": "..." }
  ]
}
```

Endpoint chỉ chấp nhận đúng ba tên file trên.

Public read-only URLs:

- `/api/lnc/files/fm24_club.lnc`
- `/api/lnc/files/fm24_competition_other.lnc`
- `/api/lnc/files/fm24_geography.lnc`

## 7. Triển khai lên Render

File [render.yaml](../render.yaml) đã cấu hình service `fm-lnc-backend` sử dụng:

- Dockerfile: `./fm-lnc-be-java/Dockerfile`
- Docker context: `./fm-lnc-be-java`
- Region: Singapore
- PostgreSQL: `fm-lnc-db`
- `LNC_FILES_DIR=/app/data`

Quy trình triển khai:

1. Build và kiểm tra local.
2. Commit các thay đổi cần triển khai.
3. Push lên branch được Render theo dõi.
4. Trong Render Dashboard, mở service `fm-lnc-backend`.
5. Chọn **Manual Deploy > Deploy latest commit** nếu auto-deploy đang tắt.
6. Theo dõi log cho đến khi Spring Boot báo đã khởi động.
7. Kiểm tra `https://<render-service>/health`.
8. Kiểm tra `https://<render-service>/api/lnc/status`.
9. Gọi `POST /api/lnc/import` nếu cần sync lại database.

Render lấy thông tin PostgreSQL từ `render.yaml`; không cần khai báo password bằng tay nếu database và service nằm trong cùng Blueprint.

## 8. Lưu ý về dữ liệu trên Render

- Ba file trong Docker image luôn tồn tại sau mỗi lần deploy.
- File được upload vào `/app/data` chỉ tồn tại trên filesystem của container hiện tại nếu service không gắn persistent disk.
- Khi Render redeploy/restart, `/app/data` sẽ trở về phiên bản được đóng gói trong Git/Docker image.
- Muốn phiên bản `.lnc` tồn tại lâu dài, cập nhật ba file trong `fm-lnc-be-java/data`, sau đó deploy lại image.
- Database PostgreSQL vẫn được lưu độc lập với filesystem của container.

## 9. Rollback

Nếu Java backend gặp sự cố production:

1. Trong Render, rollback về deployment ổn định gần nhất; hoặc
2. Đổi `render.yaml` về Dockerfile/context của NestJS:

```yaml
dockerfilePath: ./fm-lnc-be/Dockerfile
dockerContext: ./fm-lnc-be
```

Sau đó deploy lại. Java và NestJS dùng chung schema PostgreSQL nên không cần chuyển đổi database khi rollback.

## 10. Build kiểm tra trước khi deploy

```powershell
mvn clean package
```

Kết quả mong đợi:

```text
BUILD SUCCESS
target/fm-lnc-be-java-1.0.0.jar
```

Không deploy nếu build thất bại hoặc `/health`, `/api/lnc/status`, Unit Tree và Search chưa vượt qua smoke test.
