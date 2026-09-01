# LAB 09 — Đăng ký học phần xuyên hai service

JWT được bổ sung claim `userId`. Registration Service lấy người dùng từ token, không tin `studentId` do client tự chọn. Frontend có trang đăng ký, trang đã đăng ký và toast.

## Cách chạy

Khởi động Auth `8081` → Course `8085` → Registration `8083` → Gateway `8080`, rồi:

```powershell
cd D:\course-service.demo1\crs-frontend
npm run dev
```

Đăng nhập `http://localhost:5173/login` bằng `student1 / student123`.

## API

```http
POST   http://localhost:8080/api/registrations
GET    http://localhost:8080/api/registrations/my
DELETE http://localhost:8080/api/registrations/{id}
```

Body tương thích contract cũ: `{"studentId":1,"courseId":1}`. Backend ghi nhận `userId` trong JWT làm chủ sở hữu thật.

## Test giao diện

1. `Đăng ký học phần` → bấm Đăng ký môn còn chỗ: toast xanh, số chỗ giảm 1.
2. Bấm lại cùng môn: toast lỗi trùng (`409`).
3. `Đã đăng ký`: gọi `/api/registrations/my` và ghép tên qua `GET /api/courses/{id}`.
4. Hủy và xác nhận: toast xanh, dòng mất, số chỗ tăng lại.
5. Dừng Course Service rồi đăng ký: trả `409`, toast đỏ, không crash.
6. Hủy ID của người khác: backend từ chối.
