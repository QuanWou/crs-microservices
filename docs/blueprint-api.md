# Blueprint API hệ thống đăng ký học phần

## 1. Quy ước chung

### Base URL

| Mục đích | Base URL |
| --- | --- |
| Client qua Gateway | `http://localhost:8080/api` |
| Course trực tiếp khi phát triển | `http://localhost:8085` |
| Auth trực tiếp khi phát triển | `http://localhost:8081` |
| Registration trực tiếp khi phát triển | `http://localhost:8083` |

Frontend và bài test tích hợp phải ưu tiên Gateway. Các cổng service trực tiếp chủ yếu dùng để chẩn đoán.

### Header

| Header | Khi dùng | Giá trị mẫu |
| --- | --- | --- |
| `Content-Type` | Request có JSON body | `application/json` |
| `Authorization` | API cần JWT | `Bearer eyJ...` |
| `X-API-KEY` | API đối tác | `crs-partner-key-2026` |

Trong Postman, khi chọn Authorization type `Bearer Token`, ô Token chỉ nhập token hoặc `{{adminToken}}`; không thêm chữ `Bearer` lần thứ hai.

### Mã trạng thái

| Status | Ý nghĩa trong dự án |
| ---: | --- |
| `200 OK` | Đọc, cập nhật hoặc hủy thành công |
| `201 Created` | Tạo học phần hoặc đăng ký thành công |
| `204 No Content` | Xóa học phần thành công |
| `400 Bad Request` | JSON/validation không hợp lệ |
| `401 Unauthorized` | Thiếu, sai hoặc hết hạn JWT |
| `403 Forbidden` | Đã đăng nhập nhưng sai role, hoặc API key sai |
| `404 Not Found` | Không tìm thấy tài nguyên |
| `409 Conflict` | Trùng dữ liệu, hết chỗ hoặc trạng thái xung đột |
| `500 Internal Server Error` | Lỗi chưa được xử lý hoặc phụ thuộc hạ tầng |

## 2. Auth API

### `POST /api/auth/login`

Đăng nhập và nhận JWT.

Request:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response `200 OK`:

```json
{
  "token": "eyJ...",
  "username": "admin",
  "role": "ADMIN"
}
```

Tài khoản mẫu do `DataSeeder` tạo:

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | `ADMIN` |
| `student1` | `student123` | `STUDENT` |

Sai thông tin đăng nhập trả `401 Unauthorized`.

## 3. Course API

### `GET /api/courses`

Danh sách, tìm kiếm và phân trang học phần. Không cần JWT.

Query parameters:

| Tên | Mặc định | Ví dụ | Ý nghĩa |
| --- | --- | --- | --- |
| `keyword` | rỗng | `java` | Tìm gần đúng, không phân biệt hoa thường |
| `page` | `0` | `0` | Trang bắt đầu từ 0 |
| `size` | `10` | `5` | Số phần tử mỗi trang |
| `sort` | `id,asc` | `tenMonHoc,asc` | Trường và chiều sắp xếp |

Ví dụ:

```http
GET /api/courses?keyword=java&page=0&size=5&sort=tenMonHoc,asc
```

Response `200 OK` là cấu trúc Spring Data `Page`, trong đó dữ liệu nằm ở `content`.

### `GET /api/courses/{id}`

Lấy một học phần. Không cần JWT.

- Thành công: `200 OK`.
- Không tồn tại: `404 Not Found`.

### `POST /api/courses`

Tạo học phần. Yêu cầu JWT role `ADMIN`.

```json
{
  "tenMonHoc": "Kiến trúc phần mềm",
  "soTinChi": 3,
  "soChoToiDa": 30
}
```

Kết quả:

- Hợp lệ: `201 Created`.
- Validation lỗi: `400 Bad Request`.
- Không có JWT: `401 Unauthorized`.
- JWT `STUDENT`: `403 Forbidden`.

`soChoConLai` do server khởi tạo bằng `soChoToiDa`; client không cần gửi.

### `PUT /api/courses/{id}`

Cập nhật thông tin học phần. Yêu cầu role `ADMIN`.

```json
{
  "tenMonHoc": "Kiến trúc phần mềm nâng cao",
  "soTinChi": 4,
  "soChoToiDa": 35
}
```

- Thành công: `200 OK`.
- Không tồn tại: `404 Not Found`.
- Body sai: `400 Bad Request`.

### `DELETE /api/courses/{id}`

Xóa học phần. Yêu cầu role `ADMIN`.

- Thành công: `204 No Content`.
- Không tồn tại: `404 Not Found`.

## 4. Course Internal API

Các endpoint sau phục vụ giao tiếp Registration → Course, không phải API chính của frontend.

### `PATCH /internal/courses/{id}/reserve-seat`

Giảm `soChoConLai` một đơn vị trong transaction.

- Thành công: `200 OK` với Course DTO mới.
- Course không tồn tại: `404 Not Found`.
- Hết chỗ: `409 Conflict`.

### `PATCH /internal/courses/{id}/release-seat`

Tăng `soChoConLai` một đơn vị nhưng không vượt `soChoToiDa`.

- Thành công: `200 OK`.
- Course không tồn tại: `404 Not Found`.
- Trạng thái không hợp lệ: `409 Conflict` nếu nghiệp vụ từ chối.

> Bản lab hiện tại cho phép `/internal/**` tại Course Service để tập trung vào nghiệp vụ. Production cần xác thực service-to-service.

## 5. Registration API

### `POST /api/registrations`

Tạo đăng ký. Yêu cầu JWT hợp lệ; luồng demo thường dùng token `STUDENT`.

```json
{
  "studentId": 1,
  "courseId": 1
}
```

Kết quả:

- Thành công: `201 Created`.
- Thiếu JWT: `401 Unauthorized`.
- Đăng ký trùng đang hoạt động: `409 Conflict`.
- Course hết chỗ: `409 Conflict`.
- Course không tồn tại: `409 Conflict` theo mapping exception hiện tại, với thông báo `Môn học không tồn tại`.
- Không gọi được Course Service: `409 Conflict` theo mapping hiện tại, với thông báo không thể kết nối; có thể cải tiến thành `503 Service Unavailable` bằng exception riêng.

### `DELETE /api/registrations/{id}`

Hủy đăng ký và trả lại chỗ cho Course Service. Yêu cầu JWT hợp lệ.

- Thành công: `200 OK`.
- Registration không tồn tại: `404 Not Found`.
- Đã hủy hoặc trạng thái xung đột: `409 Conflict`.

## 6. Partner API

### `GET /api/public/courses`

Cho phép đối tác đọc danh sách học phần bằng API key.

```http
X-API-KEY: crs-partner-key-2026
```

- Key đúng: `200 OK`.
- Thiếu hoặc sai key: `403 Forbidden`.

Giá trị thật nên được truyền bằng biến môi trường `PARTNER_API_KEY`, không hard-code khi triển khai.

## 7. Ma trận quyền

| API | Không token | `STUDENT` | `ADMIN` | API key |
| --- | ---: | ---: | ---: | ---: |
| `POST /api/auth/login` | Cho phép | Cho phép | Cho phép | Không cần |
| `GET /api/courses` | Cho phép | Cho phép | Cho phép | Không cần |
| `GET /api/courses/{id}` | Cho phép | Cho phép | Cho phép | Không cần |
| `POST/PUT/DELETE /api/courses/**` | `401` | `403` | Cho phép | Không dùng |
| `POST/DELETE /api/registrations/**` | `401` | Cho phép | Cho phép theo security hiện tại | Không dùng |
| `GET /api/public/courses` | `403` | `403` nếu không có key | `403` nếu không có key | Cho phép khi key đúng |

## 8. Biến Postman đề nghị

| Variable | Initial/Current value |
| --- | --- |
| `gatewayBaseUrl` | `http://localhost:8080` |
| `courseBaseUrl` | `http://localhost:8085` |
| `authBaseUrl` | `http://localhost:8081` |
| `registrationBaseUrl` | `http://localhost:8083` |
| `adminToken` | để trống, lấy sau login |
| `studentToken` | để trống, lấy sau login |
| `courseId` | để trống, lưu sau khi tạo |
| `registrationId` | để trống, lưu sau khi đăng ký |
| `partnerApiKey` | `crs-partner-key-2026` |

Token nên được lưu bằng script sau trong request login:

```javascript
const body = pm.response.json();
pm.environment.set("adminToken", body.token);
```

Với login sinh viên, đổi tên biến thành `studentToken`.

## 9. Quy ước response lỗi

Các service trả JSON có trường `message` hoặc map lỗi validation. Ví dụ:

```json
{
  "message": "Cần đăng nhập bằng JWT hợp lệ"
}
```

Ví dụ validation:

```json
{
  "tenMonHoc": "Tên môn học không được để trống"
}
```

Client không nên phụ thuộc tuyệt đối vào toàn bộ cấu trúc lỗi ở nhiều service; ít nhất cần đọc `message`, status HTTP và có thông báo dự phòng.
