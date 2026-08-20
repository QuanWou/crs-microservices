# LAB 01 — Khởi tạo hệ thống Course Registration

## 1. Mục tiêu

Sau buổi này, người học có thể:

- Cài đặt và kiểm tra Java, Maven, IntelliJ IDEA, MySQL, Postman và Git.
- Phân chia ranh giới giữa các microservice trong hệ thống đăng ký học phần.
- Xây dựng bản thiết kế API trước khi viết nghiệp vụ.
- Khởi tạo `course-service` bằng Spring Boot.
- Kết nối dịch vụ với MySQL và tạo API mẫu đầu tiên.
- Đưa mã nguồn lên Git theo một quy trình có thể kiểm tra lại.

> Tài liệu gốc yêu cầu JDK 17 trở lên. Dự án hiện tại dùng Java 21 và Spring Boot 4.1.0, vì vậy hãy chọn JDK 21 trong IntelliJ.

## 2. Kết quả cần nộp

Buổi 01 yêu cầu tối thiểu các sản phẩm sau:

- Mã nguồn Spring Boot của Course Service.
- Database `course_db`.
- API mẫu `GET /courses` chạy được.
- Tài liệu [thiết kế biên giới service](docs/thiet-ke-bien-gioi-service.md).
- Tài liệu [blueprint API](docs/blueprint-api.md).
- Lịch sử commit Git rõ ràng.

## 3. Kiến trúc tổng quan

Dự án sau khi hoàn thành các buổi có năm thành phần. Trong LAB 01 chỉ cần tập trung vào Course Service, nhưng nên hiểu trước vai trò của toàn hệ thống.

| Thành phần | Cổng hiện tại | Trách nhiệm | Database sở hữu |
| --- | ---: | --- | --- |
| API Gateway | `8080` | Điểm vào chung, định tuyến, kiểm tra header sơ bộ, CORS | Không có |
| Auth Service | `8081` | Đăng nhập, phát JWT, quản lý tài khoản và sinh viên | `auth_db` |
| Course Service | `8085` | CRUD, tìm kiếm học phần, quản lý số chỗ | `course_db` |
| Registration Service | `8083` | Đăng ký và hủy đăng ký học phần | `registration_db` |
| React Frontend | `5173` | Giao diện người dùng | Không có |

Nguyên tắc quan trọng:

- Mỗi service chỉ được sở hữu và truy cập trực tiếp database của chính nó.
- Registration Service không đọc bảng `course` bằng JDBC; nó gọi HTTP sang Course Service.
- Frontend gọi API Gateway, không gọi thẳng từng service trong luồng sử dụng chính.
- Các khóa như `courseId` và `studentId` trong Registration Service là tham chiếu logic, không phải khóa ngoại xuyên database.

## 4. Chuẩn bị môi trường

### 4.1. Kiểm tra Java

Mở PowerShell và chạy:

```powershell
java -version
javac -version
```

Kết quả phải hiển thị Java 21 hoặc ít nhất Java 17. Trong IntelliJ, kiểm tra thêm:

1. Mở `File` → `Project Structure`.
2. Đặt `Project SDK` là JDK 21.
3. Đặt `Language level` tương ứng với SDK.
4. Trong cửa sổ Maven, chọn đúng JDK cho Maven Runner.

### 4.2. Kiểm tra Maven Wrapper

Dự án dùng Maven Wrapper nên không bắt buộc cài Maven toàn cục:

```powershell
cd D:\course-service.demo1\course-service.demo1
.\mvnw.cmd --version
```

### 4.3. Cấu hình Lombok trong IntelliJ

Nếu IntelliJ báo thiếu getter, setter hoặc constructor trong khi Maven vẫn có Lombok:

1. Cài plugin `Lombok` trong `Settings` → `Plugins`.
2. Mở `Settings` → `Build, Execution, Deployment` → `Compiler` → `Annotation Processors`.
3. Chọn `Enable annotation processing`.
4. Reload Maven project.

### 4.4. Kiểm tra MySQL

MySQL của máy hiện tại đang dùng cổng `2000`, không phải cổng mặc định `3306`. Kiểm tra TCP:

```powershell
Test-NetConnection localhost -Port 2000
```

Nếu MySQL client đã có trong `PATH`, kiểm tra đăng nhập:

```powershell
mysql -h localhost -P 2000 -u root -p
```

Không đưa mật khẩu thật vào tài liệu công khai hoặc commit Git.

### 4.5. Kiểm tra Git

```powershell
git --version
git config --global user.name
git config --global user.email
```

Nếu chưa cấu hình:

```powershell
git config --global user.name "Ten cua ban"
git config --global user.email "email@example.com"
```

## 5. Tạo database

Mở MySQL Workbench, kết nối `localhost:2000`, rồi chạy:

```sql
CREATE DATABASE IF NOT EXISTS course_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

SHOW DATABASES;
```

Ở LAB 01 chỉ bắt buộc `course_db`. Hai database `auth_db` và `registration_db` được dùng ở các buổi sau.

## 6. Khởi tạo Course Service

### 6.1. Thông số dự án

Nếu tạo lại bằng Spring Initializr, chọn:

| Thuộc tính | Giá trị |
| --- | --- |
| Project | Maven |
| Language | Java |
| Spring Boot | Bản tương thích với dự án |
| Java | 21 |
| Group | `vn.edu.crs` |
| Artifact | `course-service` |
| Packaging | Jar |

Dependencies cần có:

- Spring Web
- Spring Data JPA
- MySQL Driver
- Validation
- Spring Security dùng từ LAB 04
- Lombok nếu muốn giảm mã lặp

Trong repository hiện tại, module nằm tại `course-service.demo1/` và package gốc là `vn.edu.crs.course_service.demo1`.

### 6.2. Cấu hình kết nối

File `course-service.demo1/src/main/resources/application.properties` dùng biến môi trường với giá trị mặc định cho máy lab:

```properties
spring.application.name=course-service.demo1
server.port=8085

spring.datasource.url=${COURSE_DB_URL:jdbc:mysql://localhost:2000/course_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh}
spring.datasource.username=${COURSE_DB_USERNAME:root}
spring.datasource.password=${COURSE_DB_PASSWORD:6666}

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.open-in-view=false
```

Khi đưa mã nguồn lên môi trường khác, nên đặt `COURSE_DB_URL`, `COURSE_DB_USERNAME` và `COURSE_DB_PASSWORD` thay vì sửa trực tiếp file.

### 6.3. Mô hình Course

Học phần có các thuộc tính:

| Thuộc tính | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `id` | `Long` | Khóa chính tự tăng |
| `tenMonHoc` | `String` | Tên học phần |
| `soTinChi` | `Integer` | Số tín chỉ |
| `soChoToiDa` | `Integer` | Sức chứa tối đa |
| `soChoConLai` | `Integer` | Số chỗ có thể đăng ký |

Ở đúng mốc LAB 01, có thể tạo API mock trước khi kết nối đầy đủ Repository:

```java
@RestController
@RequestMapping("/courses")
public class CourseController {

    @GetMapping
    public List<Course> getCourses() {
        return List.of(
                new Course(1L, "Lập trình Java", 3, 40, 40),
                new Course(2L, "Kiến trúc phần mềm", 3, 30, 30)
        );
    }
}
```

Repository hiện tại đã phát triển qua các buổi tiếp theo nên endpoint này trả dữ liệu thật từ MySQL và có phân trang.

## 7. Chạy Course Service

### Cách 1: IntelliJ IDEA

1. Mở thư mục gốc `D:\course-service.demo1`.
2. Chờ IntelliJ tải Maven dependencies.
3. Mở `course-service.demo1/src/main/java/vn/edu/crs/course_service/demo1/Application.java`.
4. Nhấn biểu tượng chạy cạnh phương thức `main`.
5. Chờ log báo ứng dụng khởi động trên cổng `8085`.

### Cách 2: PowerShell

```powershell
cd D:\course-service.demo1\course-service.demo1
.\mvnw.cmd spring-boot:run
```

Kiểm tra cổng:

```powershell
Test-NetConnection localhost -Port 8085
```

## 8. Kiểm thử bằng Postman

### 8.1. Tạo Environment

Trong Postman, tạo một biến trên một dòng riêng:

| Variable | Value |
| --- | --- |
| `courseBaseUrl` | `http://localhost:8085` |

Không nhập chuỗi `courseBaseUrl = http://...` vào một ô Value. Tên biến và giá trị phải nằm ở hai cột riêng.

### 8.2. Gọi API đầu tiên

- Method: `GET`
- URL: `{{courseBaseUrl}}/courses`
- Authorization: `No Auth`
- Body: không cần

Nhấn `Send`. Với phiên bản hiện tại, phản hồi là một đối tượng phân trang có các trường như `content`, `totalElements`, `totalPages`, `number` và `size`.

### 8.3. Test script cơ bản

Trong tab `Scripts` → `After response`, nhập:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is JSON", function () {
    pm.response.to.be.json;
});
```

## 9. Kiểm tra database

Sau khi JPA khởi động, chạy:

```sql
USE course_db;
SHOW TABLES;
DESCRIBE course;
SELECT * FROM course;
```

Nếu dùng API mock thuần ở mốc đầu LAB 01 thì bảng có thể chưa có dữ liệu. Dữ liệu được lưu thật sau khi hoàn thành CRUD ở LAB 02.

## 10. Kiểm tra build

```powershell
cd D:\course-service.demo1\course-service.demo1
.\mvnw.cmd test
```

Nếu muốn chỉ kiểm tra biên dịch nhanh:

```powershell
.\mvnw.cmd -DskipTests package
```

## 11. Quy trình Git gợi ý

```powershell
cd D:\course-service.demo1
git status
git add course-service.demo1 LAB01.md docs
git commit -m "docs: complete lab 01 setup and architecture"
git push origin main
```

Luôn xem `git status` và `git diff --cached` trước khi commit để tránh đưa nhầm mật khẩu hoặc file tạm lên Git.

## 12. Lỗi thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| `Port 8085 was already in use` | Course Service cũ vẫn chạy | Dừng tiến trình cũ trong IntelliJ hoặc tìm PID bằng `Get-NetTCPConnection -LocalPort 8085` |
| `Access denied for user` | Sai user/password MySQL | Kiểm tra biến môi trường và tài khoản trong Workbench |
| `Unknown database 'course_db'` | Chưa tạo schema | Chạy lệnh `CREATE DATABASE course_db` |
| `Communications link failure` | Sai cổng hoặc MySQL chưa chạy | Kiểm tra `localhost:2000` và Windows Services |
| Bảng `course` không tồn tại | Service chưa khởi động thành công hoặc sai DB | Kiểm tra URL JDBC và `ddl-auto=update` |
| Postman báo `ENOTFOUND {{...}}` | Environment chưa được chọn hoặc biến khai báo sai | Chọn đúng Environment và tách tên/giá trị thành hai cột |
| IntelliJ báo class ngoài source root | Module Maven chưa được import đúng | Reload Maven hoặc mở đúng thư mục gốc chứa `pom.xml` |

## 13. Checklist hoàn thành

- [ ] Java 21, Maven Wrapper, MySQL, Postman và Git hoạt động.
- [ ] Đã tạo `course_db` trên cổng MySQL `2000`.
- [ ] Course Service khởi động ở `http://localhost:8085`.
- [ ] `GET /courses` trả về `200 OK`.
- [ ] Đã đọc và hoàn thiện hai tài liệu thiết kế trong thư mục `docs/`.
- [ ] `mvnw test` hoặc `mvnw package` chạy thành công.
- [ ] Không có mật khẩu hoặc token thật trong commit.

Tiếp theo: [LAB 02 — CRUD Course theo kiến trúc ba lớp](LAB02.md).
