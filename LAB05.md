# CRS Microservices - Lab 05

Lab 05 bổ sung frontend React + TypeScript và chỉ kết nối backend qua API Gateway.

## Cấu trúc mới

```text
crs-frontend/
  src/
    api/          Axios client và hàm gọi API
    types/        Interface khớp DTO backend
    components/   Component dùng chung cho các buổi sau
    pages/        Trang và routing cho các buổi sau
    context/      AuthContext cho các buổi sau
```

`src/api/axiosClient.ts` là nơi duy nhất đọc địa chỉ Gateway từ biến môi trường:

```text
VITE_API_BASE_URL=http://localhost:8080
```

## Chạy hệ thống

1. Chạy Course Service tại `8085`.
2. Chạy Registration Service tại `8083`.
3. Chạy Auth Service tại `8081`.
4. Chạy API Gateway tại `8080`.
5. Mở Terminal tại `crs-frontend` và chạy:

```powershell
npm install
npm run dev
```

Mở `http://localhost:5173`. Trang phải hiển thị dữ liệu trả về từ `GET /api/courses` và Console trình duyệt không có lỗi CORS.

## Kiểm tra chất lượng

```powershell
npm run lint
npm run build
```

Nếu Vite tự chuyển sang cổng khác do `5173` bị chiếm, cần đặt biến `FRONTEND_ORIGIN` tương ứng cho API Gateway và khởi động lại Gateway.
