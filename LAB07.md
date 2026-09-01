# LAB 07 — Form CRUD môn học và đồng bộ trạng thái

Lab 7 bổ sung màn hình quản trị môn học cho frontend. Form là controlled component dùng chung cho thêm và sửa; dữ liệu được kiểm tra ở client rồi gửi qua Gateway đến Course Service. Sau khi thao tác thành công, danh sách tự `refetch`, không cần F5.

## Cách chạy

1. Tạo ba schema MySQL `auth_db`, `course_db`, `registration_db`.
2. Chạy Course `8085`, Auth `8081`, Registration `8083`, Gateway `8080`.
3. Chạy frontend:

```powershell
cd D:\course-service.demo1\crs-frontend
npm ci
npm run dev
```

4. Postman gọi `POST http://localhost:8080/api/auth/login` với `admin/admin123`, copy `token`.
5. Mở `http://localhost:5173`, DevTools → Console:

```js
localStorage.setItem('crs_token', 'DAN_TOKEN_ADMIN_VAO_DAY')
```

## Chức năng và test

- `axiosClient` tự thêm Bearer token từ `crs_token`.
- `CourseForm` kiểm tra tên không rỗng, tín chỉ > 0, sức chứa > 0.
- CRUD dùng `POST/PUT/DELETE /api/courses`, lỗi server hiện dưới form.
- Bấm `+ Thêm môn học` để tạo; dữ liệu hợp lệ trả `201` và danh sách tự cập nhật.
- Tạo trùng tên trả `409`; Sửa điền dữ liệu cũ và cập nhật `200`.
- Xóa có confirm; Cancel không đổi dữ liệu, OK xóa dòng.
- Xóa `crs_token` rồi thử CRUD: `401/403`, giao diện không crash.

Các request CRUD cần Authorization Bearer token admin.
