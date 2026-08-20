# LAB 02 — CRUD Course theo kiến trúc ba lớp

## 1. Mục tiêu

LAB 02 thay API mock của LAB 01 bằng chức năng CRUD lưu thật trong MySQL. Sau buổi này, người học cần:

- Tổ chức code theo `Controller → Service → Repository`.
- Không trả JPA Entity trực tiếp ra API.
- Dùng DTO và Jakarta Validation để kiểm soát dữ liệu đầu vào.
- Xử lý lỗi tập trung bằng `@RestControllerAdvice`.
- Kiểm thử đầy đủ create, read, update, delete và validation.

## 2. Điều kiện trước khi làm

- Hoàn thành [LAB01.md](LAB01.md).
- MySQL đang chạy tại `localhost:2000`.
- Database `course_db` đã tồn tại.
- Course Service kết nối được MySQL.

Chạy nhanh để xác nhận:

```powershell
Test-NetConnection localhost -Port 2000
cd D:\course-service.demo1\course-service.demo1
.\mvnw.cmd test
```

## 3. Cấu trúc module

Các lớp quan trọng nằm dưới package `vn.edu.crs.course_service.demo1`:

```text
course-service.demo1/src/main/java/vn/edu/crs/course_service/demo1/
├── config/
├── controller/
│   └── CourseController.java
├── dto/
│   └── CourseDTO.java
├── entity/
│   └── Course.java
├── exception/
│   └── GlobalExceptionHandler.java
├── repository/
│   └── CourseRepository.java
├── service/
│   └── CourseService.java
└── Application.java
```

Luồng xử lý:

```text
HTTP Request
  -> CourseController: nhận tham số, validate, chọn status
  -> CourseService: thực hiện quy tắc nghiệp vụ, chuyển đổi DTO/Entity
  -> CourseRepository: đọc và ghi course_db
  -> GlobalExceptionHandler: đổi exception thành JSON lỗi
```

## 4. Entity Course

Entity biểu diễn bảng `course`. Các cột hiện tại:

| Cột | Kiểu Java | Ràng buộc nghiệp vụ |
| --- | --- | --- |
| `id` | `Long` | Khóa chính, tự tăng |
| `ten_mon_hoc` | `String` | Tên học phần |
| `so_tin_chi` | `Integer` | Ít nhất 1 |
| `so_cho_toi_da` | `Integer` | Ít nhất 1 |
| `so_cho_con_lai` | `Integer` | Từ 0 đến số chỗ tối đa |

Entity dùng nội bộ trong tầng persistence. Không nhận Entity trực tiếp làm `@RequestBody`, vì:

- Client có thể sửa trường server phải kiểm soát như `id` hoặc `soChoConLai`.
- Thay đổi schema database có thể vô tình làm thay đổi contract API.
- Validation và cách đặt tên API khó quản lý hơn.

## 5. CourseDTO và validation

`CourseDTO` là contract dữ liệu của API:

```java
public class CourseDTO {
    private Long id;

    @NotBlank(message = "Tên môn học không được để trống")
    private String tenMonHoc;

    @NotNull(message = "Số tín chỉ không được để trống")
    @Min(value = 1, message = "Số tín chỉ phải lớn hơn 0")
    private Integer soTinChi;

    @NotNull(message = "Số chỗ tối đa không được để trống")
    @Min(value = 1, message = "Số chỗ tối đa phải lớn hơn 0")
    private Integer soChoToiDa;

    private Integer soChoConLai;
}
```

Quy ước:

- Khi tạo, client chỉ cần gửi `tenMonHoc`, `soTinChi`, `soChoToiDa`.
- `id` do database sinh.
- `soChoConLai` do server đặt bằng `soChoToiDa`.
- Controller phải đặt `@Valid` trước `@RequestBody` để annotation validation có hiệu lực.

## 6. Repository

`CourseRepository` kế thừa `JpaRepository<Course, Long>`, vì vậy có sẵn:

- `findAll()`
- `findById(id)`
- `save(entity)`
- `existsById(id)`
- `deleteById(id)`

Phương thức custom dùng chống trùng tên:

```java
boolean existsByTenMonHocIgnoreCase(String tenMonHoc);
```

Spring Data tự sinh query dựa vào tên phương thức.

## 7. Service và quy tắc nghiệp vụ

### 7.1. Lấy danh sách

Service đọc Entity từ Repository và chuyển từng phần tử thành DTO. Repository hiện tại còn có `search(...)` phục vụ LAB 03; ở LAB 02 có thể dùng `getAll()`.

### 7.2. Lấy theo ID

Nếu không có Course, service ném:

```java
new NoSuchElementException("Không tìm thấy môn học có id = " + id)
```

Global handler chuyển lỗi này thành `404 Not Found`.

### 7.3. Tạo mới

Các bước:

1. Kiểm tra tên bằng `existsByTenMonHocIgnoreCase`.
2. Nếu đã tồn tại, trả `400 Bad Request` với thông báo `Tên môn học đã tồn tại` theo handler hiện tại.
3. Tạo Entity mới.
4. Gán `soChoConLai = soChoToiDa`.
5. Lưu và trả DTO có `id`.

### 7.4. Cập nhật

Các bước:

1. Tìm Course theo ID.
2. Không tìm thấy thì trả `404`.
3. Cập nhật tên, số tín chỉ và số chỗ tối đa.
4. Không nhận giá trị `soChoConLai` từ client trong luồng CRUD.
5. Lưu và trả DTO mới.

Lưu ý: code hiện tại không sửa `soChoConLai` trong `update`. Khi giảm `soChoToiDa`, cần đảm bảo dữ liệu thực tế không làm `soChoConLai` lớn hơn sức chứa; đây là điểm có thể bổ sung ở bài mở rộng.

### 7.5. Xóa

Service kiểm tra ID tồn tại trước khi xóa. Controller trả `204 No Content`, vì vậy response thành công không có JSON body.

## 8. Controller và endpoint

| Method | Path trực tiếp | Status thành công | Chức năng |
| --- | --- | ---: | --- |
| `GET` | `/courses` | `200` | Danh sách/phân trang |
| `GET` | `/courses/{id}` | `200` | Chi tiết |
| `POST` | `/courses` | `201` | Tạo mới |
| `PUT` | `/courses/{id}` | `200` | Cập nhật |
| `DELETE` | `/courses/{id}` | `204` | Xóa |

Sau LAB 04, thao tác ghi cần JWT `ADMIN`. Khi kiểm tra trực tiếp phiên bản repository hiện tại, vẫn phải gửi token hợp lệ.

## 9. Xử lý lỗi tập trung

`GlobalExceptionHandler` xử lý:

| Exception | HTTP status | Tình huống |
| --- | ---: | --- |
| `NoSuchElementException` | `404` | Không tìm thấy Course |
| `IllegalArgumentException` | `400` | Trùng tên hoặc đối số sai |
| `IllegalStateException` | `409` | Xung đột trạng thái, ví dụ hết chỗ |
| `MethodArgumentNotValidException` | `400` | DTO vi phạm validation |

Response lỗi validation là map `field → message`, ví dụ:

```json
{
  "tenMonHoc": "Tên môn học không được để trống",
  "soTinChi": "Số tín chỉ phải lớn hơn 0"
}
```

## 10. Chuẩn bị Postman

Nếu chỉ học LAB 02 độc lập, có thể gọi trực tiếp Course Service:

| Variable | Value |
| --- | --- |
| `courseBaseUrl` | `http://localhost:8085` |
| `courseId` | để trống |
| `adminToken` | token ADMIN sau khi hoàn thành LAB 04 |

Ở phiên bản đầy đủ hiện tại:

1. Chạy Auth Service và login admin qua Gateway.
2. Lưu `adminToken`.
3. Trong request POST/PUT/DELETE, chọn `Authorization` → `Bearer Token`.
4. Ô Token chỉ điền `{{adminToken}}`.

## 11. Kịch bản kiểm thử CRUD

### Test 1 — Tạo học phần hợp lệ

- Method: `POST`
- URL trực tiếp: `{{courseBaseUrl}}/courses`
- Authorization: Bearer `{{adminToken}}` trên code hiện tại
- Body → raw → JSON:

```json
{
  "tenMonHoc": "Lập trình Java",
  "soTinChi": 3,
  "soChoToiDa": 40
}
```

Kỳ vọng:

- Status `201 Created`.
- Response có `id`.
- `soChoConLai` bằng `40`.

After-response script:

```javascript
pm.test("Created", () => pm.response.to.have.status(201));

const body = pm.response.json();
pm.expect(body.id).to.be.a("number");
pm.expect(body.soChoConLai).to.eql(body.soChoToiDa);
pm.environment.set("courseId", body.id);
```

### Test 2 — Tạo trùng tên

Gửi lại đúng body của Test 1.

Kỳ vọng: `400 Bad Request`, thông báo `Tên môn học đã tồn tại`.

### Test 3 — Validation tên rỗng

```json
{
  "tenMonHoc": "",
  "soTinChi": 3,
  "soChoToiDa": 40
}
```

Kỳ vọng: `400 Bad Request`, có khóa `tenMonHoc`.

### Test 4 — Validation số không hợp lệ

```json
{
  "tenMonHoc": "Môn kiểm thử lỗi",
  "soTinChi": 0,
  "soChoToiDa": 0
}
```

Kỳ vọng: `400 Bad Request`, có lỗi của `soTinChi` và `soChoToiDa`.

### Test 5 — Lấy danh sách

- Method: `GET`
- URL: `{{courseBaseUrl}}/courses`
- Authorization: `No Auth`

Kỳ vọng: `200 OK`; ở code hiện tại dữ liệu nằm trong `content`.

### Test 6 — Lấy chi tiết

- Method: `GET`
- URL: `{{courseBaseUrl}}/courses/{{courseId}}`
- Authorization: `No Auth`

Kỳ vọng: `200 OK`, `id` đúng bằng `courseId`.

### Test 7 — ID không tồn tại

- Method: `GET`
- URL: `{{courseBaseUrl}}/courses/999999`

Kỳ vọng: `404 Not Found`.

### Test 8 — Cập nhật

- Method: `PUT`
- URL: `{{courseBaseUrl}}/courses/{{courseId}}`
- Authorization: Bearer `{{adminToken}}`

```json
{
  "tenMonHoc": "Lập trình Java nâng cao",
  "soTinChi": 4,
  "soChoToiDa": 45
}
```

Kỳ vọng: `200 OK`, tên và số tín chỉ đã đổi.

### Test 9 — Xóa

- Method: `DELETE`
- URL: `{{courseBaseUrl}}/courses/{{courseId}}`
- Authorization: Bearer `{{adminToken}}`

Kỳ vọng: `204 No Content` và response body rỗng.

### Test 10 — Xác nhận đã xóa

Gọi lại `GET /courses/{{courseId}}`.

Kỳ vọng: `404 Not Found`.

## 12. Kiểm tra trực tiếp bằng SQL

```sql
USE course_db;

SELECT
    id,
    ten_mon_hoc,
    so_tin_chi,
    so_cho_toi_da,
    so_cho_con_lai
FROM course
ORDER BY id;
```

Sau POST, phải có một dòng mới. Sau PUT, dữ liệu phải thay đổi. Sau DELETE, dòng tương ứng phải biến mất.

## 13. Chạy và xác minh

```powershell
cd D:\course-service.demo1\course-service.demo1
.\mvnw.cmd clean test
.\mvnw.cmd spring-boot:run
```

Chỉ chạy một instance trên cổng `8085` để tránh lỗi trùng cổng.

## 14. Lỗi thường gặp

| Lỗi | Giải thích | Cách sửa |
| --- | --- | --- |
| POST trả `400` dù JSON có dữ liệu | Sai tên field hoặc gửi chuỗi rỗng | Dùng đúng `tenMonHoc`, `soTinChi`, `soChoToiDa` |
| POST trả `401` | Code đã có LAB 04 Security | Login admin và gửi Bearer token |
| POST trả `403` | Đang dùng token `STUDENT` | Dùng token tài khoản `admin` |
| `Content-Type` không hỗ trợ | Body không để raw JSON | Chọn `Body` → `raw` → `JSON` |
| `Table 'course_db.course' doesn't exist` | Service chưa tạo bảng hoặc trỏ sai DB | Kiểm tra URL JDBC, database và log Hibernate |
| DELETE trả body rỗng | Đúng thiết kế `204` | Không cố parse JSON ở test DELETE |
| Đổi tên field trong Entity làm SQL lỗi | Schema cũ không đồng bộ | Kiểm tra mapping và migration/schema hiện tại |

## 15. Checklist hoàn thành

- [ ] Có đủ Entity, DTO, Repository, Service, Controller và Global Handler.
- [ ] POST hợp lệ trả `201` và khởi tạo đúng số chỗ.
- [ ] GET danh sách và GET chi tiết trả đúng dữ liệu.
- [ ] PUT cập nhật được các trường được phép.
- [ ] DELETE trả `204` và dữ liệu bị xóa.
- [ ] Validation trả `400` với thông báo rõ ràng.
- [ ] Không trả JPA Entity trực tiếp ra controller.
- [ ] `mvnw clean test` chạy thành công.

Tiếp theo: [LAB 03 — Tìm kiếm, phân trang và Registration Service](LAB03.md).
