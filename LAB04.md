# LAB 04 — JWT, role, API Gateway, API key và CORS

## 1. Mục tiêu

LAB 04 bổ sung lớp bảo mật và điểm vào thống nhất cho hệ thống:

- Auth Service xác thực username/password và phát JWT.
- JWT chứa username ở `sub`, role ở claim `role`, cùng thời gian phát/hết hạn.
- Course Service và Registration Service tự xác minh JWT.
- Course Service phân quyền thao tác ghi cho `ADMIN`.
- API Gateway định tuyến request qua cổng `8080`.
- API đối tác được bảo vệ bằng `X-API-KEY`.
- CORS cho phép React Frontend tại `http://localhost:5173`.

## 2. Kiến trúc sau LAB 04

```text
Postman / React :5173
          |
          v
API Gateway :8080
  ├── /api/auth/**          -> Auth Service :8081
  ├── /api/courses/**       -> Course Service :8085
  ├── /api/registrations/** -> Registration Service :8083
  └── /api/public/courses   -> Course Service :8085
```

Các cổng service trực tiếp vẫn mở để phát triển, nhưng bài test tích hợp phải ưu tiên `http://localhost:8080`.

## 3. Database Auth

Tạo schema:

```sql
CREATE DATABASE IF NOT EXISTS auth_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

Auth Service dùng:

```properties
server.port=8081
spring.datasource.url=${AUTH_DB_URL:jdbc:mysql://localhost:2000/auth_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh}
spring.datasource.username=${AUTH_DB_USERNAME:root}
spring.datasource.password=${AUTH_DB_PASSWORD:6666}
spring.jpa.hibernate.ddl-auto=update

jwt.secret=${JWT_SECRET:gia-tri-mac-dinh-cua-du-an}
jwt.expiration-ms=86400000
```

`JWT_SECRET` của Auth, Course và Registration phải giống nhau. Nếu Auth ký bằng secret A nhưng service đích xác minh bằng secret B, login vẫn thành công nhưng request sau đó trả `401`.

## 4. Mô hình người dùng

### 4.1. User

User lưu:

- `id`
- `username`
- `password` đã mã hóa BCrypt
- `role`, hiện có `ADMIN` và `STUDENT`

Không lưu password thô trong database.

### 4.2. Student

Student lưu thông tin sinh viên và liên kết một User. Dữ liệu mẫu:

- Họ tên: `Sinh viên mẫu`
- MSSV: `SV001`
- User: `student1`

### 4.3. DataSeeder

Khi Auth Service khởi động lần đầu, `DataSeeder` tạo nếu chưa có:

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | `ADMIN` |
| `student1` | `student123` | `STUDENT` |

Seeder kiểm tra tồn tại trước khi tạo nên khởi động lại không sinh tài khoản trùng.

## 5. Đăng nhập và JWT

### Request

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "username": "admin",
  "password": "admin123"
}
```

### Response

```json
{
  "token": "eyJ...",
  "username": "admin",
  "role": "ADMIN"
}
```

JWT hiện có:

- Subject: username.
- Claim `role`: `ADMIN` hoặc `STUDENT`.
- `iat`: thời điểm phát.
- `exp`: thời điểm hết hạn.
- Chữ ký HMAC dựa trên `JWT_SECRET`.

Token là credential nhạy cảm. Không chụp hoặc commit token còn hiệu lực vào repository.

## 6. Security tại service đích

### 6.1. Course Service

| Request | Quyền |
| --- | --- |
| `GET /courses/**` | Public |
| `/internal/**` | Permit trong phạm vi lab |
| `POST /courses/**` | `ADMIN` |
| `PUT /courses/**` | `ADMIN` |
| `DELETE /courses/**` | `ADMIN` |
| Request khác | Authenticated |

Kết quả:

- Không có JWT hoặc JWT sai: `401 Unauthorized`.
- JWT hợp lệ nhưng role không đủ: `403 Forbidden`.

### 6.2. Registration Service

`/registrations/**` yêu cầu JWT hợp lệ. Security hiện tại cho cả `STUDENT` và `ADMIN` nếu đã xác thực. Luồng nghiệp vụ demo nên dùng token sinh viên.

Giới hạn hiện tại: `studentId` được lấy từ request body và chưa được đối chiếu với người dùng trong JWT. Trong hệ thống thật, nên đưa student ID vào claim hoặc tra từ Auth Service, sau đó server tự xác định sinh viên thay vì tin ID do client gửi.

### 6.3. Vì sao service vẫn phải xác minh JWT

Gateway hiện chỉ kiểm tra header bắt đầu bằng `Bearer `; nó không xác minh chữ ký. Người dùng cũng có thể gọi trực tiếp `8085` hoặc `8083`. Vì vậy, Course và Registration Service phải tự parse token, kiểm tra chữ ký, hạn dùng và role.

## 7. Cấu hình API Gateway

Gateway chạy tại `8080` và rewrite path:

| Client gọi | Service nhận |
| --- | --- |
| `/api/auth/login` | Auth `/auth/login` |
| `/api/courses` | Course `/courses` |
| `/api/courses/10` | Course `/courses/10` |
| `/api/registrations` | Registration `/registrations` |
| `/api/registrations/5` | Registration `/registrations/5` |
| `/api/public/courses` | Course `/courses` |

Các URL service đích có thể đổi bằng:

- `AUTH_SERVICE_URL`
- `COURSE_SERVICE_URL`
- `REGISTRATION_SERVICE_URL`

## 8. Gateway filter

### 8.1. AuthHeaderFilter

Gateway bỏ qua kiểm tra Bearer header cho:

- `/api/auth/login`
- `/api/public/courses`
- `GET /api/courses/**`

Các request khác thiếu header `Authorization: Bearer ...` bị chặn `401` ngay tại Gateway.

### 8.2. ApiKeyFilter

`/api/public/courses` yêu cầu:

```http
X-API-KEY: crs-partner-key-2026
```

Key có thể thay bằng biến môi trường `PARTNER_API_KEY`. Thiếu hoặc sai key trả `403`.

## 9. CORS và Origin

Gateway cho phép origin:

```text
http://localhost:5173
```

`Origin` là địa chỉ trang web khởi tạo request, gồm scheme, host và port. Khi React chạy ở `http://localhost:5173`, trình duyệt tự gửi:

```http
Origin: http://localhost:5173
```

Không thêm `/` cuối origin và không viết Markdown như `[http://...](http://...)` vào cấu hình. Postman không bị chính sách CORS của trình duyệt nên thường không cần tự nhập header Origin.

Nếu frontend chạy cổng khác, cập nhật `FRONTEND_ORIGIN` rồi khởi động lại Gateway.

## 10. Thứ tự chạy toàn hệ thống backend

### Trong IntelliJ

Chạy lần lượt:

1. Course `Application` — `8085`.
2. Registration `RegistrationServiceApplication` — `8083`.
3. Auth `AuthServiceApplication` — `8081`.
4. Gateway `ApiGatewayApplication` — `8080`.

Trong cửa sổ Services, cả bốn ứng dụng phải có biểu tượng đang chạy và hiển thị đúng cổng.

### Kiểm tra cổng

```powershell
Test-NetConnection localhost -Port 8080
Test-NetConnection localhost -Port 8081
Test-NetConnection localhost -Port 8083
Test-NetConnection localhost -Port 8085
```

Mở `http://localhost:8080` trong trình duyệt và thấy `404 Whitelabel` là bình thường: Gateway không có route cho path `/`. Hãy gọi một API cụ thể như `/api/courses`.

## 11. Tạo Postman Environment đúng cách

Chọn Environment đang hoạt động ở góc trên bên phải, rồi tạo mỗi biến trên một dòng:

| Variable | Value |
| --- | --- |
| `gatewayBaseUrl` | `http://localhost:8080` |
| `adminToken` | để trống |
| `studentToken` | để trống |
| `courseId` | để trống |
| `registrationId` | để trống |
| `partnerApiKey` | `crs-partner-key-2026` |

Nếu Postman báo `getaddrinfo ENOTFOUND {{gatewaybaseurl}}`, kiểm tra:

1. Đã chọn đúng Environment chưa.
2. Tên biến có đúng chữ hoa/thường `gatewayBaseUrl` không.
3. Value có đúng `http://localhost:8080` không.
4. Không đặt cả `gatewayBaseUrl = ...` vào một ô.

Postman có thể hiển thị `Secrets Detected` khi phát hiện JWT hoặc key. Đây là cảnh báo bảo mật, không phải lỗi API. Có thể giữ token ở Environment local/Vault, nhưng đừng biến một chuỗi ngẫu nhiên khác thành JWT.

## 12. Quy trình Postman từ đầu

Thực hiện đúng thứ tự sau để không lẫn token.

### Bước 1 — Login ADMIN

- Method: `POST`
- URL: `{{gatewayBaseUrl}}/api/auth/login`
- Authorization: `No Auth`
- Body → raw → JSON:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

After-response script:

```javascript
pm.test("Admin login succeeds", () => pm.response.to.have.status(200));

const body = pm.response.json();
pm.expect(body.role).to.eql("ADMIN");
pm.environment.set("adminToken", body.token);
```

Sau khi Send, kiểm tra `adminToken` đã có giá trị bắt đầu gần giống `eyJ`.

### Bước 2 — Login STUDENT

Tạo request mới, không sửa request admin nếu muốn giữ collection rõ ràng.

```json
{
  "username": "student1",
  "password": "student123"
}
```

After-response script:

```javascript
pm.test("Student login succeeds", () => pm.response.to.have.status(200));

const body = pm.response.json();
pm.expect(body.role).to.eql("STUDENT");
pm.environment.set("studentToken", body.token);
```

### Bước 3 — GET Course public

- Method: `GET`
- URL: `{{gatewayBaseUrl}}/api/courses?page=0&size=10&sort=id,asc`
- Authorization: `No Auth`

Kỳ vọng: `200 OK`.

### Bước 4 — Chứng minh POST không token bị chặn

- Method: `POST`
- URL: `{{gatewayBaseUrl}}/api/courses`
- Authorization: `No Auth`
- Body:

```json
{
  "tenMonHoc": "Kiến trúc phần mềm",
  "soTinChi": 3,
  "soChoToiDa": 30
}
```

Kỳ vọng: `401 Unauthorized`.

### Bước 5 — Chứng minh STUDENT không có quyền tạo Course

Trong Authorization:

1. Chọn `Bearer Token`.
2. Ô Token chỉ nhập `{{studentToken}}`.
3. Không nhập `Bearer {{studentToken}}`, vì Postman tự thêm chữ Bearer.

Gửi lại POST Course. Kỳ vọng: `403 Forbidden`.

### Bước 6 — Tạo Course bằng ADMIN

Đổi ô Token thành:

```text
{{adminToken}}
```

Body:

```json
{
  "tenMonHoc": "Kiến trúc phần mềm",
  "soTinChi": 3,
  "soChoToiDa": 30
}
```

Kỳ vọng: `201 Created`.

After-response script:

```javascript
pm.test("Admin creates course", () => pm.response.to.have.status(201));

const body = pm.response.json();
pm.environment.set("courseId", body.id);
```

Nếu vẫn `403`, kiểm tra response login đã có `"role": "ADMIN"`, request thật sự dùng `adminToken`, và không có hai biến `adminToken` ở scope khác nhau ghi đè nhau.

### Bước 7 — Đăng ký bằng STUDENT

- Method: `POST`
- URL: `{{gatewayBaseUrl}}/api/registrations`
- Authorization: Bearer Token `{{studentToken}}`
- Body:

```json
{
  "studentId": 1,
  "courseId": {{courseId}}
}
```

Kỳ vọng: `201 Created`.

```javascript
pm.test("Registration created", () => pm.response.to.have.status(201));

const body = pm.response.json();
pm.environment.set("registrationId", body.id);
```

### Bước 8 — Hủy đăng ký

- Method: `DELETE`
- URL: `{{gatewayBaseUrl}}/api/registrations/{{registrationId}}`
- Authorization: Bearer Token `{{studentToken}}`

Kỳ vọng: `200 OK`, body rỗng.

### Bước 9 — API đối tác

- Method: `GET`
- URL: `{{gatewayBaseUrl}}/api/public/courses`
- Authorization: `No Auth`
- Header: `X-API-KEY` = `{{partnerApiKey}}`

Kỳ vọng key đúng: `200 OK`.

Xóa header hoặc sửa key. Kỳ vọng: `403 Forbidden`.

## 13. Ma trận test bắt buộc

| # | Request | Credential | Kỳ vọng |
| ---: | --- | --- | ---: |
| 1 | Login admin | admin/admin123 | `200` + role ADMIN |
| 2 | Login student | student1/student123 | `200` + role STUDENT |
| 3 | GET courses | Không có | `200` |
| 4 | POST course | Không có | `401` |
| 5 | POST course | Student JWT | `403` |
| 6 | POST course | Admin JWT | `201` |
| 7 | PUT course | Admin JWT | `200` |
| 8 | POST registration | Student JWT | `201` |
| 9 | DELETE registration | Student JWT | `200` |
| 10 | Partner courses | API key đúng | `200` |
| 11 | Partner courses | Thiếu/sai key | `403` |
| 12 | POST course | JWT hỏng/hết hạn | `401` |

## 14. Test CORS

CORS đáng tin cậy nhất khi test từ frontend ở LAB 05. Có thể kiểm tra preflight thủ công:

- Method: `OPTIONS`
- URL: `{{gatewayBaseUrl}}/api/courses`
- Headers:

```http
Origin: http://localhost:5173
Access-Control-Request-Method: POST
Access-Control-Request-Headers: authorization,content-type
```

Response cần có header CORS phù hợp. Nếu Origin khác, trình duyệt có thể chặn dù backend thực tế đã xử lý request.

## 15. Kiểm tra database Auth

```sql
USE auth_db;

SELECT id, username, role FROM app_user;
SELECT id, ho_ten, mssv, user_id FROM student;
```

## 16. Build từng module

```powershell
cd D:\course-service.demo1\auth-service
.\mvnw.cmd clean test

cd D:\course-service.demo1\api-gateway
.\mvnw.cmd clean test

cd D:\course-service.demo1\course-service.demo1
.\mvnw.cmd clean test

cd D:\course-service.demo1\registration-service
.\mvnw.cmd clean test
```

## 17. Lỗi thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| Login `200` nhưng API sau `401` | JWT secret giữa service không giống nhau | Đặt cùng `JWT_SECRET`, restart các service |
| POST Course `403` | Dùng token STUDENT hoặc biến token bị ghi đè | Login lại admin, kiểm tra role và scope biến |
| Token field là `Bearer {{adminToken}}` | Postman thêm Bearer lần nữa | Chỉ nhập `{{adminToken}}` |
| `DataSeeder` không compile vì `getId()` | User thiếu getter hoặc Lombok không chạy | Có getter thủ công/`@Getter`, bật annotation processing |
| Gateway `404` tại `/` | Không có route root | Gọi `/api/courses` hoặc API cụ thể |
| Gateway trả `503`/connection refused | Service đích chưa chạy | Kiểm tra cổng 8081/8083/8085 |
| Browser báo CORS | Frontend origin khác cấu hình | Chạy đúng `localhost:5173` hoặc đổi `FRONTEND_ORIGIN` |
| Postman báo Secret Detected | Postman nhận diện token/key | Là cảnh báo; giữ secret local và không commit |
| `ENOTFOUND {{gatewayBaseUrl}}` | Sai Environment/biến | Chọn đúng Environment và đặt đúng tên/value |

## 18. Checklist hoàn thành

- [ ] Có `auth_db` và tài khoản seed ADMIN/STUDENT.
- [ ] Login trả JWT đúng role.
- [ ] Các service dùng cùng `JWT_SECRET`.
- [ ] GET Course public hoạt động.
- [ ] Course write phân biệt đúng `401`, `403`, `201`.
- [ ] Registration yêu cầu JWT.
- [ ] Gateway định tuyến đủ Auth, Course và Registration.
- [ ] API key đúng/sai cho kết quả `200/403`.
- [ ] CORS cho phép đúng `http://localhost:5173`.
- [ ] Bốn module backend build/test thành công.

Tiếp theo: [LAB 05 — React + Vite kết nối API Gateway](LAB05.md).
