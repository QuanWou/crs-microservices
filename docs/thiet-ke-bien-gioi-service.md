# Thiết kế biên giới các service

## 1. Mục đích

Tài liệu này xác định trách nhiệm, dữ liệu sở hữu và cách giao tiếp giữa các thành phần của hệ thống đăng ký học phần. Ranh giới rõ ràng giúp tránh việc một service can thiệp trực tiếp vào database của service khác.

## 2. Bối cảnh nghiệp vụ

Hệ thống hỗ trợ các luồng chính:

- Quản trị viên tạo, sửa và xóa học phần.
- Người dùng xem và tìm kiếm học phần.
- Sinh viên đăng nhập và đăng ký học phần còn chỗ.
- Sinh viên hủy một đăng ký đã tạo.
- Đối tác đọc danh sách học phần bằng API key.

## 3. Sơ đồ thành phần

```text
React Frontend :5173
        |
        v
API Gateway :8080
   |         |          |
   v         v          v
Auth :8081  Course :8085  Registration :8083
   |            |              |
auth_db      course_db     registration_db
                              |
                              | HTTP nội bộ
                              v
                         Course :8085
```

## 4. Ranh giới trách nhiệm

### 4.1. API Gateway

API Gateway chịu trách nhiệm:

- Cung cấp một base URL duy nhất cho frontend và Postman.
- Định tuyến `/api/auth/**`, `/api/courses/**` và `/api/registrations/**`.
- Kiểm tra sự tồn tại của Bearer token trên các đường dẫn cần đăng nhập.
- Bảo vệ API đối tác bằng header `X-API-KEY`.
- Thiết lập CORS cho frontend `http://localhost:5173`.

API Gateway không chịu trách nhiệm:

- Xác thực chữ ký và nội dung JWT thay cho service đích.
- Chứa nghiệp vụ môn học hoặc đăng ký.
- Truy cập trực tiếp bất kỳ database nghiệp vụ nào.

### 4.2. Auth Service

Auth Service sở hữu:

- Tài khoản đăng nhập.
- Mật khẩu đã băm bằng BCrypt.
- Role của người dùng.
- Thông tin sinh viên gắn với tài khoản.
- Quá trình kiểm tra username/password và phát JWT.

Auth Service không quản lý học phần hoặc lượt đăng ký. Các service khác chỉ tin JWT khi chữ ký hợp lệ và secret đồng nhất.

### 4.3. Course Service

Course Service sở hữu:

- Tên học phần.
- Số tín chỉ.
- Số chỗ tối đa.
- Số chỗ còn lại.
- Quy tắc giữ chỗ và trả chỗ.
- Tìm kiếm, phân trang và CRUD học phần.

Chỉ Course Service được cập nhật `soChoConLai`. Registration Service phải gọi API nội bộ để giữ hoặc trả chỗ.

### 4.4. Registration Service

Registration Service sở hữu:

- `studentId` của người đăng ký.
- `courseId` của học phần được chọn.
- Trạng thái đăng ký.
- Thời điểm tạo đăng ký.
- Quy tắc chống đăng ký trùng.
- Luồng phối hợp giữ/trả chỗ qua Course Service.

Registration Service không được truy vấn trực tiếp `course_db` hoặc `auth_db`.

### 4.5. React Frontend

Frontend chịu trách nhiệm:

- Hiển thị danh sách học phần.
- Tìm kiếm và phân trang.
- Thu thập thông tin đăng nhập.
- Lưu trạng thái phiên ở phía trình duyệt theo thiết kế ứng dụng.
- Gửi Bearer token qua Axios khi gọi API cần xác thực.
- Hiển thị thông báo tải dữ liệu, thành công và lỗi.

Frontend không quyết định quyền cuối cùng. Backend vẫn phải xác thực JWT và role.

## 5. Quyền sở hữu dữ liệu

| Dữ liệu | Service sở hữu | Database | Service khác sử dụng bằng |
| --- | --- | --- | --- |
| User, role, password | Auth Service | `auth_db` | JWT hoặc API Auth |
| Student | Auth Service | `auth_db` | `studentId` trong JWT/luồng nghiệp vụ |
| Course | Course Service | `course_db` | REST API |
| Số chỗ còn lại | Course Service | `course_db` | API reserve/release |
| Registration | Registration Service | `registration_db` | REST API |

Quy tắc bắt buộc:

1. Không tạo foreign key giữa các database của hai service.
2. Không dùng chung JPA Entity giữa các module.
3. Dữ liệu trao đổi qua DTO JSON.
4. Một service bị dừng phải tạo ra lỗi HTTP có ý nghĩa, không làm service gọi treo vô hạn.

## 6. Luồng đăng ký học phần

```text
Sinh viên
  -> API Gateway: POST /api/registrations + JWT
  -> Registration Service: kiểm tra đăng ký trùng
  -> Course Service: PATCH /internal/courses/{id}/reserve-seat
  -> Course Service: khóa giao dịch, giảm chỗ nếu còn
  -> Registration Service: lưu bản ghi DANG_KY
  -> trả 201 Created
```

Luồng hủy:

```text
Sinh viên
  -> API Gateway: DELETE /api/registrations/{id} + JWT
  -> Registration Service: đổi trạng thái DA_HUY
  -> Course Service: PATCH /internal/courses/{id}/release-seat
  -> Course Service: tăng chỗ nhưng không vượt soChoToiDa
  -> trả 200 OK
```

## 7. Tính nhất quán và giao dịch phân tán

`@Transactional` chỉ bảo vệ giao dịch trong database của một service. Nó không thể tự động rollback đồng thời `course_db` và `registration_db`.

Rủi ro ví dụ:

1. Course Service đã giảm chỗ.
2. Registration Service lỗi trước khi lưu đăng ký.
3. Hai database không còn nhất quán.

Phiên bản lab hiện tại minh họa cách gọi đồng bộ đơn giản. Hướng phát triển thực tế:

- Saga với hành động bù `release-seat`.
- Transactional Outbox và message broker.
- Idempotency key cho yêu cầu đăng ký.
- Retry có giới hạn và circuit breaker.
- Endpoint nội bộ được xác thực service-to-service.

## 8. Ranh giới bảo mật

| Lớp | Việc kiểm tra |
| --- | --- |
| Gateway | Header Bearer có mặt, API key đối tác, CORS |
| Auth Service | Username/password, phát token |
| Course Service | Chữ ký JWT, role `ADMIN` cho thao tác ghi |
| Registration Service | Chữ ký JWT, yêu cầu người dùng đã đăng nhập |

Không nên chỉ dựa vào Gateway. Người dùng có thể thử gọi trực tiếp cổng `8085` hoặc `8083`, vì vậy service đích vẫn phải xác thực JWT.

## 9. Quyết định kỹ thuật hiện tại

| Quyết định | Lý do |
| --- | --- |
| REST/JSON | Dễ quan sát và kiểm thử bằng Postman |
| MySQL riêng cho từng service | Minh họa database-per-service |
| `RestTemplate` cho lời gọi nội bộ | Phù hợp phạm vi bài lab |
| JWT stateless | Không cần session dùng chung |
| API Gateway WebFlux | Định tuyến không đồng bộ và CORS tập trung |
| React + Vite | Phát triển frontend nhanh, cấu hình đơn giản |

## 10. Tiêu chí kiểm tra biên giới

- [ ] Mỗi service chỉ khai báo datasource của database mình sở hữu.
- [ ] Registration Service gọi Course Service qua HTTP.
- [ ] Frontend chỉ cấu hình base URL của Gateway.
- [ ] Không có Entity JPA dùng chung giữa các module.
- [ ] API ghi Course yêu cầu role `ADMIN` tại Course Service.
- [ ] API Registration yêu cầu JWT tại Registration Service.
- [ ] CORS chỉ cho phép origin frontend đã cấu hình.

