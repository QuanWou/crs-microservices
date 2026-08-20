# CRS Microservices - Lab 04

Lab 04 bổ sung xác thực JWT, phân quyền và API Gateway cho hệ thống.

| Service | Cổng | Vai trò |
|---|---:|---|
| `api-gateway` | 8080 | Điểm vào duy nhất cho client |
| `auth-service` | 8081 | Đăng nhập và cấp JWT |
| `registration-service` | 8083 | Đăng ký và hủy đăng ký |
| `course-service.demo1` | 8085 | Quản lý môn học và chỗ học |

## 1. Chuẩn bị database

Course và registration database đã được tạo từ Lab 03. Tạo thêm auth database:

```sql
CREATE DATABASE IF NOT EXISTS auth_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Project mặc định kết nối MySQL cổng `2000`, user `root`, password `6666`. Nếu máy đang dùng mật khẩu khác, cấu hình biến môi trường trong từng Run Configuration của IntelliJ:

```text
COURSE_DB_PASSWORD=<mật khẩu MySQL>
REGISTRATION_DB_PASSWORD=<mật khẩu MySQL>
AUTH_DB_PASSWORD=<mật khẩu MySQL>
```

Có thể thay toàn bộ URL/user bằng các biến `COURSE_DB_URL`, `COURSE_DB_USERNAME`, `REGISTRATION_DB_URL`, `REGISTRATION_DB_USERNAME`, `AUTH_DB_URL`, `AUTH_DB_USERNAME`.

JWT secret phải giống nhau ở ba service. Khi cần thay secret mặc định, đặt cùng một biến cho course, registration và auth:

```text
JWT_SECRET=<chuỗi bí mật dài tối thiểu 32 byte>
```

## 2. Import module vào IntelliJ

Nhấp phải từng file sau và chọn **Add as Maven Project**:

- `auth-service/pom.xml`
- `api-gateway/pom.xml`
- `registration-service/pom.xml` nếu chưa được import từ Lab 03.

Không chọn **Move to source root**.

## 3. Chạy hệ thống

Chạy lần lượt bốn main class:

1. `course-service.demo1` - `Application`
2. `registration-service` - `RegistrationServiceApplication`
3. `auth-service` - `AuthServiceApplication`
4. `api-gateway` - `ApiGatewayApplication`

Hoặc mở bốn PowerShell tại thư mục gốc và chạy:

```powershell
.\course-service.demo1\mvnw.cmd -f .\course-service.demo1\pom.xml spring-boot:run
.\course-service.demo1\mvnw.cmd -f .\registration-service\pom.xml spring-boot:run
.\course-service.demo1\mvnw.cmd -f .\auth-service\pom.xml spring-boot:run
.\course-service.demo1\mvnw.cmd -f .\api-gateway\pom.xml spring-boot:run
```

Từ Lab 04, client chỉ gọi `http://localhost:8080`.

## 4. Tài khoản mẫu

Auth service tự tạo dữ liệu khi khởi động lần đầu:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `student1` | `student123` | STUDENT |

## 5. Biến Postman

```text
gatewayBaseUrl = http://localhost:8080
adminToken =
studentToken =
courseId =
registrationId =
```

Đăng nhập ADMIN:

```http
POST {{gatewayBaseUrl}}/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Đăng nhập STUDENT:

```json
{
  "username": "student1",
  "password": "student123"
}
```

Lưu `token` từ hai response vào `adminToken` và `studentToken`.

## 6. Các path kiểm thử

| Case | Method và URL | Header | Kỳ vọng |
|---|---|---|---:|
| Login ADMIN | `POST {{gatewayBaseUrl}}/api/auth/login` | Không cần | 200 |
| Xem course | `GET {{gatewayBaseUrl}}/api/courses?page=0&size=5` | Không cần | 200 |
| Tạo course thiếu token | `POST {{gatewayBaseUrl}}/api/courses` | Không có Authorization | 401 |
| STUDENT tạo course | `POST {{gatewayBaseUrl}}/api/courses` | `Bearer {{studentToken}}` | 403 |
| ADMIN tạo course | `POST {{gatewayBaseUrl}}/api/courses` | `Bearer {{adminToken}}` | 201 |
| Chi tiết course | `GET {{gatewayBaseUrl}}/api/courses/{{courseId}}` | Không cần | 200 |
| ADMIN cập nhật | `PUT {{gatewayBaseUrl}}/api/courses/{{courseId}}` | `Bearer {{adminToken}}` | 200 |
| STUDENT đăng ký | `POST {{gatewayBaseUrl}}/api/registrations` | `Bearer {{studentToken}}` | 201 |
| Hủy đăng ký | `DELETE {{gatewayBaseUrl}}/api/registrations/{{registrationId}}` | `Bearer {{studentToken}}` | 200 |
| API đối tác đúng key | `GET {{gatewayBaseUrl}}/api/public/courses` | `X-API-KEY: crs-partner-key-2026` | 200 |
| API đối tác thiếu/sai key | `GET {{gatewayBaseUrl}}/api/public/courses` | Thiếu hoặc sai key | 403 |

Body tạo course:

```json
{
  "tenMonHoc": "Kiến trúc phần mềm",
  "soTinChi": 3,
  "soChoToiDa": 30
}
```

Body đăng ký:

```json
{
  "studentId": 1,
  "courseId": {{courseId}}
}
```

## 7. Kiểm tra lớp bảo vệ độc lập

Hai request sau cố tình gọi thẳng service và phải bị từ chối khi không có JWT:

```text
POST http://localhost:8085/courses                         -> 401
POST http://localhost:8083/registrations                   -> 401
```

Route `/internal/courses/**` không được khai báo tại Gateway. Nó chỉ dành cho registration-service gọi trực tiếp và vẫn được course-service cho phép.

## 8. Chạy test tự động

```powershell
.\course-service.demo1\mvnw.cmd -f .\course-service.demo1\pom.xml test
.\course-service.demo1\mvnw.cmd -f .\registration-service\pom.xml test
.\course-service.demo1\mvnw.cmd -f .\auth-service\pom.xml test
.\course-service.demo1\mvnw.cmd -f .\api-gateway\pom.xml test
```

> Secret và API key mặc định chỉ phục vụ lab. Trước khi deploy thật phải thay bằng secret manager hoặc biến môi trường, không commit giá trị production lên Git.
