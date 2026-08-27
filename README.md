# CRS Microservices — Hệ thống đăng ký học phần

Repository minh họa kiến trúc microservices bằng Spring Boot, Spring Cloud Gateway, JWT, MySQL và React + Vite. Tài liệu LAB 01–06 đã được chuẩn hóa theo source và cổng đang dùng trong dự án này.

## Mục lục tài liệu

| Tài liệu | Nội dung chính |
| --- | --- |
| [LAB01.md](LAB01.md) | Môi trường, kiến trúc, Course Service ban đầu, MySQL, Postman, Git |
| [LAB02.md](LAB02.md) | CRUD Course, ba lớp, DTO, validation, xử lý lỗi |
| [LAB03.md](LAB03.md) | Search, pagination, giữ/trả chỗ, Registration Service |
| [LAB04.md](LAB04.md) | Auth, JWT, role, Gateway, API key, CORS, Postman đầy đủ |
| [LAB05.md](LAB05.md) | React TypeScript, Axios, Vite, kết nối Gateway |
| [LAB06.md](LAB06.md) | Danh sách Course, tìm kiếm debounce, phân trang và bốn trạng thái UI |
| [docs/thiet-ke-bien-gioi-service.md](docs/thiet-ke-bien-gioi-service.md) | Biên giới trách nhiệm và quyền sở hữu dữ liệu |
| [docs/blueprint-api.md](docs/blueprint-api.md) | Contract endpoint, status, quyền và mẫu JSON |

## Thành phần và cổng

| Thành phần | Thư mục | Cổng | Database |
| --- | --- | ---: | --- |
| API Gateway | `api-gateway/` | `8080` | Không có |
| Auth Service | `auth-service/` | `8081` | `auth_db` |
| Registration Service | `registration-service/` | `8083` | `registration_db` |
| Course Service | `course-service.demo1/` | `8085` | `course_db` |
| React Frontend | `crs-frontend/` | `5173` | Không có |
| MySQL | Ngoài repository | `2000` | Ba schema ở trên |

## Yêu cầu môi trường

- Java 21.
- MySQL 8 đang lắng nghe tại `localhost:2000`.
- Node.js và npm cho frontend.
- IntelliJ IDEA hoặc terminal PowerShell.
- Postman để chạy test tích hợp.

## 1. Tạo database

Chạy bằng MySQL Workbench:

```sql
CREATE DATABASE IF NOT EXISTS course_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS registration_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS auth_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Các module hiện có giá trị mặc định local cho MySQL. Khi chạy trên máy/môi trường khác, ưu tiên đặt biến môi trường:

- `COURSE_DB_URL`, `COURSE_DB_USERNAME`, `COURSE_DB_PASSWORD`
- `REGISTRATION_DB_URL`, `REGISTRATION_DB_USERNAME`, `REGISTRATION_DB_PASSWORD`
- `AUTH_DB_URL`, `AUTH_DB_USERNAME`, `AUTH_DB_PASSWORD`
- `JWT_SECRET`

Ba service dùng JWT phải nhận cùng `JWT_SECRET`.

## 2. Build backend

Chạy lần lượt:

```powershell
cd D:\course-service.demo1\course-service.demo1
.\mvnw.cmd clean test

cd D:\course-service.demo1\registration-service
.\mvnw.cmd clean test

cd D:\course-service.demo1\auth-service
.\mvnw.cmd clean test

cd D:\course-service.demo1\api-gateway
.\mvnw.cmd clean test
```

## 3. Chạy backend trong IntelliJ

Mở `D:\course-service.demo1`, reload toàn bộ Maven projects và chạy:

1. `vn.edu.crs.course_service.demo1.Application` — Course `8085`.
2. `vn.edu.crs.registrationservice.RegistrationServiceApplication` — Registration `8083`.
3. `vn.edu.crs.authservice.AuthServiceApplication` — Auth `8081`.
4. `vn.edu.crs.apigateway.ApiGatewayApplication` — Gateway `8080`.

Kiểm tra:

```powershell
Test-NetConnection localhost -Port 8080
Test-NetConnection localhost -Port 8081
Test-NetConnection localhost -Port 8083
Test-NetConnection localhost -Port 8085
```

## 4. Chạy frontend

```powershell
cd D:\course-service.demo1\crs-frontend
npm ci
npm run dev
```

Mở `http://localhost:5173`. File `.env` đã trỏ frontend đến Gateway:

```dotenv
VITE_API_BASE_URL=http://localhost:8080
```

## 5. Smoke test nhanh

### Xem Course public

```http
GET http://localhost:8080/api/courses?page=0&size=10
```

Kỳ vọng: `200 OK`.

### Login admin

```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json
```

```json
{
  "username": "admin",
  "password": "admin123"
}
```

### Login student

```json
{
  "username": "student1",
  "password": "student123"
}
```

Quy trình Postman từng bước, cách lưu token và toàn bộ ma trận `401/403/201` nằm trong [LAB04.md](LAB04.md).

## 6. Các URL quan trọng

| Method | URL qua Gateway | Quyền |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/courses` | Public |
| `GET` | `/api/courses/{id}` | Public |
| `POST` | `/api/courses` | ADMIN |
| `PUT` | `/api/courses/{id}` | ADMIN |
| `DELETE` | `/api/courses/{id}` | ADMIN |
| `POST` | `/api/registrations` | JWT hợp lệ |
| `DELETE` | `/api/registrations/{id}` | JWT hợp lệ |
| `GET` | `/api/public/courses` | `X-API-KEY` hợp lệ |

Base URL Gateway:

```text
http://localhost:8080
```

## 7. Tài khoản dữ liệu mẫu

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | `ADMIN` |
| `student1` | `student123` | `STUDENT` |

Các tài khoản này chỉ dùng trong môi trường lab.

## 8. Phân biệt lỗi thường gặp

| Status/hiện tượng | Ý nghĩa thường gặp |
| --- | --- |
| `404` khi mở `http://localhost:8080/` | Bình thường vì Gateway không có route root |
| `401` | Thiếu, sai, hết hạn JWT hoặc secret không đồng nhất |
| `403` | JWT hợp lệ nhưng sai role, hoặc API key sai |
| `409` | Đăng ký trùng, hết chỗ hoặc trạng thái xung đột |
| `500` kèm table không tồn tại | Chưa tạo đúng database hoặc JPA trỏ sai schema |
| Browser báo CORS | Origin frontend không khớp `http://localhost:5173` |
| Postman `ENOTFOUND {{...}}` | Environment chưa chọn hoặc biến sai |

## 9. Kiểm tra trước khi commit

```powershell
cd D:\course-service.demo1
git status
git diff
```

Không commit:

- JWT đang còn hiệu lực.
- API key hoặc secret production.
- Mật khẩu database thật.
- `node_modules/`, `target/`, `dist/` nếu đã được ignore.
- File cấu hình cá nhân của IDE không cần thiết.

## 10. Phạm vi và hướng phát triển

Dự án hiện minh họa luồng đồng bộ giữa Registration và Course bằng REST. Để gần production hơn, có thể bổ sung:

- Saga/Transactional Outbox cho giao dịch phân tán.
- Locking chống overselling khi nhiều sinh viên đăng ký đồng thời.
- Service-to-service authentication cho `/internal/**`.
- Idempotency key và retry/circuit breaker.
- Auth Context, Login, Course CRUD và Registration UI đầy đủ.
- Container hóa bằng Docker Compose và quản lý secret riêng.
