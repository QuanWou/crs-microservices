# CRS Microservices - Lab 03

Lab 03 gồm hai Spring Boot service chạy độc lập:

- `course-service.demo1`: CRUD môn học, tìm kiếm/phân trang và API nội bộ giữ/hoàn chỗ; cổng `8085`.
- `registration-service`: đăng ký/hủy đăng ký và gọi HTTP sang course-service; cổng `8083`.

## 1. Chuẩn bị database

MySQL của project hiện được cấu hình ở cổng `2000`, tài khoản mặc định `root` và mật khẩu rỗng. Tạo hai database trước khi chạy:

```sql
CREATE DATABASE IF NOT EXISTS course_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS registration_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Nếu môi trường của bạn khác, đặt các biến môi trường sau thay vì sửa source:

- Course service: `COURSE_DB_URL`, `COURSE_DB_USERNAME`, `COURSE_DB_PASSWORD`.
- Registration service: `REGISTRATION_DB_URL`, `REGISTRATION_DB_USERNAME`, `REGISTRATION_DB_PASSWORD`.
- URL liên-service: `COURSE_SERVICE_BASE_URL` (mặc định `http://localhost:8085`).

## 2. Chạy hai service

Mở hai cửa sổ PowerShell tại thư mục gốc project.

Course service:

```powershell
.\course-service.demo1\mvnw.cmd -f .\course-service.demo1\pom.xml spring-boot:run
```

Registration service:

```powershell
.\course-service.demo1\mvnw.cmd -f .\registration-service\pom.xml spring-boot:run
```

## 3. API Lab 03

Tìm kiếm và phân trang:

```text
GET http://localhost:8085/courses?keyword=java&page=0&size=5&sort=tenMonHoc,asc
```

API nội bộ của course-service:

```text
PATCH http://localhost:8085/internal/courses/1/reserve-seat
PATCH http://localhost:8085/internal/courses/1/release-seat
```

Đăng ký môn học:

```http
POST http://localhost:8083/registrations
Content-Type: application/json

{
  "studentId": 1,
  "courseId": 1
}
```

Hủy đăng ký:

```text
DELETE http://localhost:8083/registrations/1
```

## 4. Chạy test

```powershell
.\course-service.demo1\mvnw.cmd -f .\course-service.demo1\pom.xml test
.\course-service.demo1\mvnw.cmd -f .\registration-service\pom.xml test
```

Các test dùng H2 in-memory nên không cần bật MySQL hoặc chạy service còn lại.
