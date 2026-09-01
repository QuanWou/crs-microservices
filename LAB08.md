# LAB 08 — Routing, đăng nhập và phân quyền giao diện

## Cách chạy

```powershell
cd D:\course-service.demo1\auth-service; mvn test
cd D:\course-service.demo1\course-service.demo1; mvn test
cd D:\course-service.demo1\registration-service; mvn test
cd D:\course-service.demo1\api-gateway; mvn test
cd D:\course-service.demo1\crs-frontend; npm ci; npm run dev
```

Chạy các ứng dụng Spring Boot ở `8081`, `8085`, `8083`, `8080`, mở `http://localhost:5173/login`.

## Route và tài khoản

| URL | Quyền | Ý nghĩa |
| --- | --- | --- |
| `/login` | Public | Đăng nhập |
| `/courses` | Public | Xem danh sách |
| `/admin/courses` | ADMIN | CRUD môn học |
| `/register-course` | STUDENT | Đăng ký (hoàn thiện Lab 9) |

ADMIN: `admin / admin123`; STUDENT: `student1 / student123`.

## Test

1. Mở `/admin/courses` khi chưa đăng nhập → `/login`.
2. Sai mật khẩu → hiện `Sai username hoặc password`.
3. Student đăng nhập → `/courses`, Navbar có STUDENT và link đăng ký.
4. Student mở `/admin/courses` → `/courses`.
5. Admin đăng nhập → thấy Quản trị và nút CRUD.
6. F5 → phiên còn vì `crs_token` và `crs_user` được khôi phục.
7. Sửa JWT rồi gọi API cần quyền → `401`, interceptor xóa phiên và chuyển `/login`.
8. `/courses` công khai không có cột thao tác.
