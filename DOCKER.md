# Chạy CRS bằng Docker Compose

## Khởi động

Từ thư mục gốc:

```powershell
cd D:\course-service.demo1
docker compose up --build -d
docker compose ps
```

Mở frontend tại `http://localhost:5173` và dùng Gateway tại `http://localhost:8080`.

## Tài khoản mẫu

- Admin: `admin / admin123`
- Student: `student1 / student123`

## Xem log

```powershell
docker compose logs -f api-gateway
docker compose logs -f registration-service
```

## Dừng hệ thống

```powershell
docker compose down
```

Lệnh trên giữ dữ liệu trong volume. Muốn xóa cả dữ liệu Docker và tạo lại database rỗng:

```powershell
docker compose down -v
```
