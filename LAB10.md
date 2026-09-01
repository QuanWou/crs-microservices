# LAB 10 — Tích hợp toàn hệ thống và cách chạy

Cổng thực tế của repository: Gateway `8080`, Auth `8081`, Course `8085`, Registration `8083`, Frontend `5173`.

## Khởi động và kiểm tra

Chạy IntelliJ theo thứ tự Auth → Course → Registration → Gateway, sau đó frontend:

```powershell
cd D:\course-service.demo1\crs-frontend
npm run dev
```

Kiểm tra cổng:

```powershell
8081,8083,8085,8080 | ForEach-Object { Test-NetConnection localhost -Port $_ -InformationLevel Quiet }
Invoke-RestMethod "http://localhost:8080/api/courses?page=0&size=10"
```

## E2E

1. `/login` với `student1/student123`: `POST /api/auth/login` trả `200`, có token, userId, role.
2. `/courses`: GET public trả `200`.
3. Tìm kiếm: GET có `keyword`, `page=0`.
4. `/register-course` → Đăng ký: `POST /api/registrations` trả `201`, số chỗ giảm.
5. `/my-registrations`: GET `/api/registrations/my` trả `200`, hiện tên môn.
6. Hủy: `DELETE /api/registrations/{id}` trả `200`, dòng mất, chỗ tăng.
7. Đăng xuất: xóa localStorage và route bảo vệ chuyển về `/login`.

Mở DevTools → Network để đối chiếu URL, Bearer header, JSON và status.

## Lỗi liên service

Dừng Course Service, giữ các service khác, bấm Đăng ký. Registration không gọi được `reserve-seat`, trả `409` và frontend hiện toast đỏ. Bật Course lại rồi thử lại.

## Bảo mật Postman

| Trường hợp | Kỳ vọng |
| --- | --- |
| Không token → `POST /api/registrations` | `401` |
| Token STUDENT → `POST /api/courses` | `403` |
| Token ADMIN → `POST /api/courses` | `201` |
| Sửa một ký tự JWT | `401` |
| Thiếu `X-API-KEY` ở `/api/public/courses` | `403` |
| `X-API-KEY: crs-partner-key-2026` | `200` |
| Gọi trực tiếp `/internal/...` Course `8085` | Có thể thành công theo thiết kế hiện tại; đây là giới hạn cần cải thiện |

## Build cuối

```powershell
cd D:\course-service.demo1\auth-service; mvn test
cd D:\course-service.demo1\course-service.demo1; mvn test
cd D:\course-service.demo1\registration-service; mvn test
cd D:\course-service.demo1\api-gateway; mvn test
cd D:\course-service.demo1\crs-frontend; npm run lint; npm run build
```

Docker Compose là phần tự học: khi container hóa, đổi URL `localhost` liên service thành tên container và truyền qua biến môi trường.
