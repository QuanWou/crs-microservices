# LAB 03 — Tìm kiếm, phân trang và Registration Service

## 1. Mục tiêu

LAB 03 mở rộng hệ thống từ CRUD một service thành luồng phối hợp giữa hai microservice. Kết quả cần đạt:

- Course Service hỗ trợ tìm kiếm, phân trang và sắp xếp.
- Course Service có API nội bộ để giữ và trả chỗ.
- Việc thay đổi số chỗ được thực hiện trong transaction.
- Registration Service dùng database riêng.
- Registration Service gọi Course Service qua HTTP, không truy cập `course_db`.
- Hệ thống chặn đăng ký trùng và đăng ký khi hết chỗ.
- Người học hiểu giới hạn của `@Transactional` trong hệ thống phân tán.

## 2. Điều kiện trước khi làm

- Hoàn thành CRUD Course trong [LAB02.md](LAB02.md).
- MySQL chạy tại `localhost:2000`.
- Course Service chạy tại `localhost:8085`.
- Java 21 được chọn cho cả hai module Maven.

## 3. Tạo database Registration

Trong MySQL Workbench:

```sql
CREATE DATABASE IF NOT EXISTS registration_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

SHOW DATABASES;
```

Course Service và Registration Service phải dùng hai schema khác nhau:

| Service | Schema |
| --- | --- |
| Course Service | `course_db` |
| Registration Service | `registration_db` |

## 4. Cấu hình các service

### 4.1. Course Service

```properties
server.port=8085
spring.datasource.url=${COURSE_DB_URL:jdbc:mysql://localhost:2000/course_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh}
spring.datasource.username=${COURSE_DB_USERNAME:root}
spring.datasource.password=${COURSE_DB_PASSWORD:6666}
spring.jpa.hibernate.ddl-auto=update
```

### 4.2. Registration Service

```properties
server.port=8083
spring.datasource.url=${REGISTRATION_DB_URL:jdbc:mysql://localhost:2000/registration_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh}
spring.datasource.username=${REGISTRATION_DB_USERNAME:root}
spring.datasource.password=${REGISTRATION_DB_PASSWORD:6666}
spring.jpa.hibernate.ddl-auto=update

course-service.base-url=${COURSE_SERVICE_BASE_URL:http://localhost:8085}
course-service.connect-timeout=3s
course-service.read-timeout=5s
```

Các giá trị mặc định chỉ phục vụ máy lab. Khi triển khai, truyền credentials bằng biến môi trường.

## 5. Tìm kiếm và phân trang Course

### 5.1. Repository query

```java
Page<Course> findByTenMonHocContainingIgnoreCase(
        String keyword,
        Pageable pageable
);
```

`ContainingIgnoreCase` tạo truy vấn chứa từ khóa và không phân biệt hoa thường.

### 5.2. Service

Quy tắc tìm kiếm:

- `keyword` null hoặc trống: gọi `findAll(pageable)`.
- Có `keyword`: trim rồi gọi query theo tên.
- Dùng `Page.map(...)` để chuyển Entity thành DTO mà vẫn giữ metadata phân trang.

### 5.3. API

```http
GET /courses?keyword=java&page=0&size=5&sort=tenMonHoc,asc
```

Các tham số:

| Parameter | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `keyword` | rỗng | Một phần tên môn học |
| `page` | `0` | Chỉ số trang bắt đầu từ 0 |
| `size` | `10` | Số bản ghi mỗi trang |
| `sort` | `id,asc` nếu client gửi | Trường và chiều sắp xếp |

Response mẫu rút gọn:

```json
{
  "content": [
    {
      "id": 1,
      "tenMonHoc": "Lập trình Java",
      "soTinChi": 3,
      "soChoToiDa": 40,
      "soChoConLai": 39
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 5,
  "number": 0
}
```

## 6. API giữ và trả chỗ

Course Service cung cấp hai endpoint nội bộ:

| Method | Path | Tác dụng |
| --- | --- | --- |
| `PATCH` | `/internal/courses/{id}/reserve-seat` | Giảm số chỗ còn lại 1 |
| `PATCH` | `/internal/courses/{id}/release-seat` | Tăng số chỗ còn lại 1 |

### 6.1. Reserve seat

Quy tắc:

1. Tìm Course theo ID; không có thì ném `NoSuchElementException`.
2. Nếu `soChoConLai <= 0`, ném `IllegalStateException`.
3. Giảm một chỗ.
4. Lưu trong transaction.

Kết quả:

- Thành công: `200 OK`.
- Không có Course: `404 Not Found`.
- Hết chỗ: `409 Conflict`.

### 6.2. Release seat

Chỉ tăng khi `soChoConLai < soChoToiDa`. Điều kiện này tránh tăng quá sức chứa tối đa.

### 6.3. Vai trò của `@Transactional`

`@Transactional` giữ các thao tác đọc, kiểm tra và ghi Course trong một transaction của `course_db`. Nó không tạo giao dịch chung với `registration_db`.

Trong hệ thống nhiều request đồng thời, có thể bổ sung pessimistic locking hoặc optimistic locking để chống hai transaction cùng đọc một giá trị chỗ. Phạm vi lab hiện tại minh họa transaction cơ bản.

## 7. Thiết kế Registration Service

Cấu trúc chính:

```text
registration-service/src/main/java/vn/edu/crs/registrationservice/
├── client/CourseClient.java
├── config/RestTemplateConfig.java
├── controller/RegistrationController.java
├── dto/RegistrationRequestDTO.java
├── entity/Registration.java
├── exception/GlobalExceptionHandler.java
├── repository/RegistrationRepository.java
├── service/RegistrationService.java
└── RegistrationServiceApplication.java
```

### 7.1. Entity Registration

| Trường | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `id` | `Long` | Khóa chính tự tăng |
| `studentId` | `Long` | ID logic của sinh viên |
| `courseId` | `Long` | ID logic của học phần |
| `trangThai` | `String` | `DA_DANG_KY` hoặc `DA_HUY` |
| `ngayDangKy` | `LocalDateTime` | Thời gian tạo đăng ký |

Không khai báo `@ManyToOne Course`, vì Course nằm ở database và service khác.

### 7.2. Request DTO

```json
{
  "studentId": 1,
  "courseId": 1
}
```

Cả hai trường đều có `@NotNull`.

### 7.3. Repository

Phương thức quan trọng:

```java
boolean existsByStudentIdAndCourseIdAndTrangThai(
        Long studentId,
        Long courseId,
        String trangThai
);
```

Nó chặn một sinh viên có hai đăng ký đang hoạt động cho cùng Course.

## 8. RestTemplate hỗ trợ PATCH

`CourseClient` có field `final RestTemplate`, vì vậy phải khởi tạo qua constructor:

```java
public CourseClient(RestTemplate restTemplate) {
    this.restTemplate = restTemplate;
}
```

Nếu thiếu constructor, Java báo:

```text
variable restTemplate not initialized in the default constructor
```

Configuration hiện tại dùng JDK HTTP client để hỗ trợ PATCH và timeout:

```java
@Bean
public RestTemplate restTemplate(
        @Value("${course-service.connect-timeout:3s}") Duration connectTimeout,
        @Value("${course-service.read-timeout:5s}") Duration readTimeout) {
    HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(connectTimeout)
            .build();

    JdkClientHttpRequestFactory requestFactory =
            new JdkClientHttpRequestFactory(httpClient);
    requestFactory.setReadTimeout(readTimeout);

    return new RestTemplate(requestFactory);
}
```

Timeout giúp Registration Service không chờ vô hạn khi Course Service không phản hồi.

## 9. Luồng đăng ký

`RegistrationService.register(...)` thực hiện:

1. Kiểm tra đăng ký `DA_DANG_KY` đã tồn tại.
2. Nếu trùng, trả `409 Conflict`.
3. Gọi `PATCH /internal/courses/{courseId}/reserve-seat`.
4. Chỉ khi Course Service trả thành công mới tạo Registration.
5. Đặt trạng thái `DA_DANG_KY` và thời gian hiện tại.
6. Trả `201 Created`.

Điểm quan trọng: không lưu Registration trước khi Course Service xác nhận đã giữ chỗ.

## 10. Luồng hủy

`RegistrationService.cancel(...)` thực hiện:

1. Tìm Registration theo ID.
2. Không tồn tại thì trả `404`.
3. Nếu đã `DA_HUY`, trả `409`.
4. Gọi Course Service để trả chỗ.
5. Chỉ sau khi trả chỗ thành công mới đổi trạng thái thành `DA_HUY`.
6. Controller hiện tại trả `200 OK` với body rỗng.

## 11. Lỗi từ Course Service

`CourseClient` chuyển lỗi phụ thuộc thành thông báo của Registration Service:

| Lỗi Course | Thông báo phía Registration | Status hiện tại |
| --- | --- | ---: |
| Course trả `404` | `Môn học không tồn tại` | `409` |
| Course trả `409` | `Môn học đã hết chỗ` | `409` |
| Course trả lỗi khác | `Course-service từ chối yêu cầu` | `409` |
| Không kết nối/timeout | `Không thể kết nối tới course-service...` | `409` |

Status đều là `409` vì `CourseClient` ném `IllegalStateException` và Global Handler hiện ánh xạ exception đó sang Conflict. Nếu muốn contract chi tiết hơn, tạo exception riêng cho `404` và `503`.

## 12. Thứ tự chạy

### IntelliJ IDEA

1. Chạy `Application` của Course Service, cổng `8085`.
2. Chạy `RegistrationServiceApplication`, cổng `8083`.
3. Kiểm tra cả hai icon trong cửa sổ Services đều có ký hiệu đang chạy.

### PowerShell

Mở hai cửa sổ terminal riêng.

Terminal 1:

```powershell
cd D:\course-service.demo1\course-service.demo1
.\mvnw.cmd spring-boot:run
```

Terminal 2:

```powershell
cd D:\course-service.demo1\registration-service
.\mvnw.cmd spring-boot:run
```

Kiểm tra:

```powershell
Test-NetConnection localhost -Port 8085
Test-NetConnection localhost -Port 8083
```

## 13. Postman Environment

Tạo các biến:

| Variable | Value |
| --- | --- |
| `courseBaseUrl` | `http://localhost:8085` |
| `registrationBaseUrl` | `http://localhost:8083` |
| `courseId` | ID Course đang có |
| `registrationId` | để trống |
| `studentToken` | token sinh viên nếu code đã có LAB 04 |

Với repository hiện tại, `/registrations/**` đã yêu cầu JWT. Vì vậy phải chạy Auth và Gateway hoặc lấy sẵn token hợp lệ trước khi test Registration.

## 14. Kịch bản Postman quan trọng

### Test 1 — Tìm kiếm có phân trang

- Method: `GET`
- URL: `{{courseBaseUrl}}/courses?keyword=java&page=0&size=5&sort=tenMonHoc,asc`
- Authorization: `No Auth`

Script:

```javascript
pm.test("Search succeeds", () => pm.response.to.have.status(200));

const body = pm.response.json();
pm.expect(body.content).to.be.an("array");
pm.expect(body.number).to.eql(0);
pm.expect(body.size).to.eql(5);
```

### Test 2 — Giữ chỗ trực tiếp

- Method: `PATCH`
- URL: `{{courseBaseUrl}}/internal/courses/{{courseId}}/reserve-seat`
- Body: none

Kỳ vọng: `200`, `soChoConLai` giảm 1.

### Test 3 — Trả chỗ trực tiếp

- Method: `PATCH`
- URL: `{{courseBaseUrl}}/internal/courses/{{courseId}}/release-seat`
- Body: none

Kỳ vọng: `200`, chỗ tăng 1 nhưng không vượt tối đa.

### Test 4 — Tạo đăng ký

- Method: `POST`
- URL: `{{registrationBaseUrl}}/registrations`
- Authorization: Bearer `{{studentToken}}` trên code hiện tại
- Body:

```json
{
  "studentId": 1,
  "courseId": {{courseId}}
}
```

Kỳ vọng:

- `201 Created`.
- Response có `id`, `trangThai` bằng `DA_DANG_KY`.
- Course giảm một chỗ.

Script lưu ID:

```javascript
pm.test("Registration created", () => pm.response.to.have.status(201));

const body = pm.response.json();
pm.expect(body.trangThai).to.eql("DA_DANG_KY");
pm.environment.set("registrationId", body.id);
```

### Test 5 — Đăng ký trùng

Gửi lại đúng request Test 4.

Kỳ vọng: `409 Conflict`, số chỗ không tiếp tục giảm.

### Test 6 — Hủy đăng ký

- Method: `DELETE`
- URL: `{{registrationBaseUrl}}/registrations/{{registrationId}}`
- Authorization: Bearer `{{studentToken}}`

Kỳ vọng: `200 OK`, body rỗng, Course được trả một chỗ.

### Test 7 — Hủy lần hai

Gửi lại Test 6.

Kỳ vọng: `409 Conflict`, thông báo đăng ký đã được hủy.

### Test 8 — Course không tồn tại

```json
{
  "studentId": 1,
  "courseId": 999999
}
```

Kỳ vọng theo code hiện tại: `409 Conflict`, thông báo `Môn học không tồn tại`.

### Test 9 — Course Service ngừng chạy

1. Dừng Course Service.
2. Gửi POST Registration với một cặp ID chưa đăng ký.

Kỳ vọng theo code hiện tại: `409 Conflict`, thông báo không thể kết nối Course Service; request kết thúc sau timeout thay vì treo vô hạn.

3. Khởi động lại Course Service sau test.

## 15. Kiểm tra database

```sql
USE registration_db;

SELECT
    id,
    student_id,
    course_id,
    trang_thai,
    ngay_dang_ky
FROM registration
ORDER BY id DESC;
```

Đối chiếu số chỗ:

```sql
USE course_db;

SELECT
    id,
    ten_mon_hoc,
    so_cho_toi_da,
    so_cho_con_lai
FROM course
ORDER BY id;
```

Không tạo foreign key từ `registration_db.registration.course_id` sang `course_db.course.id`.

## 16. Giao dịch phân tán: điều chưa được giải quyết

Tình huống có thể xảy ra:

1. Course Service giảm chỗ thành công.
2. Registration Service mất kết nối database trước khi lưu.
3. Chỗ đã giảm nhưng không có Registration.

`@Transactional` ở Registration Service không thể rollback transaction đã commit tại Course Service. Các giải pháp phù hợp ngoài phạm vi lab:

- Saga và hành động bù.
- Transactional Outbox.
- Message broker.
- Idempotency key.
- Retry có kiểm soát và circuit breaker.

## 17. Build và kiểm tra

```powershell
cd D:\course-service.demo1\course-service.demo1
.\mvnw.cmd clean test

cd D:\course-service.demo1\registration-service
.\mvnw.cmd clean test
```

## 18. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| `restTemplate not initialized` | Field `final` không có constructor | Dùng constructor injection như mục 8 |
| PATCH trả `405` | Request factory không hỗ trợ PATCH hoặc sai path | Dùng `JdkClientHttpRequestFactory`, kiểm tra URL |
| Registration trả lỗi kết nối Course | Course Service chưa chạy hoặc sai base URL | Kiểm tra cổng `8085` và `COURSE_SERVICE_BASE_URL` |
| `registration` table không tồn tại | Sai schema hoặc JPA chưa tạo bảng | Kiểm tra `registration_db` và log khởi động |
| Đăng ký luôn trả `401` | Thiếu JWT sau LAB 04 | Login student và chọn Bearer Token |
| Đăng ký lần hai trả `409` | Đúng nghiệp vụ chống trùng | Hủy đăng ký cũ hoặc dùng sinh viên/Course khác |

## 19. Checklist hoàn thành

- [ ] Tìm kiếm Course không phân biệt hoa thường.
- [ ] Pagination trả đúng `content` và metadata.
- [ ] Reserve giảm chỗ và chặn khi hết.
- [ ] Release tăng chỗ nhưng không vượt tối đa.
- [ ] Registration dùng `registration_db` riêng.
- [ ] Không có quan hệ JPA xuyên service.
- [ ] POST Registration trả `201` và chống trùng.
- [ ] DELETE Registration đổi trạng thái và hoàn chỗ.
- [ ] Course Client có timeout và xử lý lỗi phụ thuộc.
- [ ] Cả hai module build/test thành công.

Tiếp theo: [LAB 04 — JWT, role, API Gateway, API key và CORS](LAB04.md).
