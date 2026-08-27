# LAB 05 — React + Vite kết nối API Gateway

## 1. Mục tiêu

LAB 05 tạo frontend React TypeScript và kết nối nó với backend qua API Gateway. Sau buổi này cần đạt:

- Khởi tạo React bằng Vite.
- Dùng TypeScript type cho Course, Auth, Registration và lỗi API.
- Dùng Axios client với một base URL duy nhất.
- Gọi `GET /api/courses` qua Gateway.
- Hiển thị trạng thái loading, thành công và lỗi.
- Chạy frontend đúng origin `http://localhost:5173` để kiểm tra CORS.
- Build và lint frontend thành công.

## 2. Điều kiện trước khi làm

- Hoàn thành backend đến [LAB04.md](LAB04.md).
- API Gateway chạy tại `8080`.
- Course Service chạy tại `8085`.
- Node.js và npm đã cài đặt.

Kiểm tra:

```powershell
node --version
npm --version
Test-NetConnection localhost -Port 8080
Test-NetConnection localhost -Port 8085
```

## 3. Luồng request

```text
Browser http://localhost:5173
  -> Axios baseURL http://localhost:8080
  -> GET /api/courses
  -> API Gateway :8080
  -> rewrite thành GET /courses
  -> Course Service :8085
  -> JSON Page<Course>
  -> React hiển thị response.data.content
```

Frontend không cần biết Course Service chạy ở `8085`. Nếu thay vị trí Course Service, chỉ Gateway cần thay route.

## 4. Khởi tạo dự án

Nếu tạo mới hoàn toàn:

```powershell
cd D:\course-service.demo1
npm create vite@latest crs-frontend -- --template react-ts
cd crs-frontend
npm install
npm install axios react-router-dom
```

Repository hiện đã có `crs-frontend/` và lock file. Khi clone về, ưu tiên:

```powershell
cd D:\course-service.demo1\crs-frontend
npm ci
```

`npm ci` cài đúng phiên bản trong lock file và phù hợp cho kiểm tra lặp lại/CI.

## 5. Cấu trúc frontend hiện tại

```text
crs-frontend/
├── .env
├── package.json
├── vite.config.ts
└── src/
    ├── api/
    │   ├── axiosClient.ts
    │   └── courseApi.ts
    ├── types/
    │   ├── apiError.ts
    │   ├── auth.ts
    │   ├── course.ts
    │   └── registration.ts
    ├── App.css
    ├── App.tsx
    ├── index.css
    └── main.tsx
```

Phạm vi hiện tại tập trung xác nhận kết nối Course qua Gateway. Các type Auth và Registration đã chuẩn bị cho màn hình login/đăng ký ở bước phát triển tiếp theo.

## 6. Biến môi trường

File `crs-frontend/.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:8080
```

Quy tắc của Vite:

- Chỉ biến bắt đầu bằng `VITE_` được đưa vào client.
- Biến này có thể bị người dùng trình duyệt đọc được.
- Không đặt JWT secret, database password hoặc service-role key vào file frontend.
- Sau khi sửa `.env`, phải dừng và chạy lại `npm run dev`.

## 7. Axios client

`src/api/axiosClient.ts` là nơi duy nhất chứa địa chỉ backend:

```typescript
import axios from 'axios'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default axiosClient
```

Lợi ích:

- API modules chỉ dùng path `/api/...`.
- Dễ đổi Gateway giữa local, staging và production.
- Có thể bổ sung interceptor JWT ở một nơi.

Interceptor gợi ý khi xây màn hình login:

```typescript
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
```

Chỉ thêm interceptor khi ứng dụng thực sự quản lý token. Không hard-code token vào source.

## 8. TypeScript types

### 8.1. Course

```typescript
export interface Course {
  id: number
  tenMonHoc: string
  soTinChi: number
  soChoToiDa: number
  soChoConLai: number
}

export interface PagedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}
```

Backend trả một `Page`, không phải mảng trực tiếp. Vì vậy phải đọc `response.data.content`.

### 8.2. Auth

```typescript
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  username: string
  role: 'ADMIN' | 'STUDENT'
}
```

### 8.3. Registration

```typescript
export interface Registration {
  id: number
  studentId: number
  courseId: number
  trangThai: 'DA_DANG_KY' | 'DA_HUY'
  ngayDangKy: string
}
```

### 8.4. API error

```typescript
export interface ApiErrorResponse {
  message?: string
  [field: string]: string | undefined
}
```

Type lỗi cho phép đọc cả `{ "message": "..." }` và map validation theo field.

## 9. Course API module

`src/api/courseApi.ts`:

```typescript
import axiosClient from './axiosClient'
import type { Course, PagedResponse } from '../types/course'

export const getCourses = (keyword?: string, page = 0, size = 10) =>
  axiosClient.get<PagedResponse<Course>>('/api/courses', {
    params: { keyword, page, size },
  })
```

Ví dụ `getCourses('java', 0, 5)` tạo request gần tương đương:

```http
GET http://localhost:8080/api/courses?keyword=java&page=0&size=5
```

## 10. Component kiểm tra kết nối

`App.tsx` hiện thực hiện ba trạng thái:

1. `isLoading`: hiển thị `Đang tải dữ liệu…`.
2. `error`: hiển thị hướng dẫn kiểm tra Gateway.
3. Thành công: hiển thị số Course trong trang và JSON dữ liệu.

Phần gọi API:

```typescript
useEffect(() => {
  getCourses()
    .then((response) => setCourses(response.data.content))
    .catch((requestError: unknown) => {
      console.error(requestError)
      setError(
        'Không kết nối được tới hệ thống. Hãy kiểm tra API Gateway đã chạy ở cổng 8080.',
      )
    })
    .finally(() => setIsLoading(false))
}, [])
```

`useEffect` có dependency array rỗng nên gọi một lần khi component mount. Trong React development mode, `StrictMode` có thể làm effect chạy hai lần để phát hiện side effect; đây không nhất thiết là lỗi backend.

## 11. Chạy hệ thống đúng thứ tự

### Backend

Để màn hình Course hoạt động, tối thiểu cần:

1. MySQL `2000`.
2. Course Service `8085`.
3. API Gateway `8080`.

Để kiểm tra login và Registration, chạy thêm:

4. Auth Service `8081`.
5. Registration Service `8083`.

### Frontend

```powershell
cd D:\course-service.demo1\crs-frontend
npm run dev
```

Mở chính xác:

```text
http://localhost:5173
```

Không đổi thành `http://127.0.0.1:5173` nếu Gateway chỉ cho `http://localhost:5173`, vì hai origin này khác nhau.

## 12. Kiểm tra backend bằng Postman trước

Trước khi kết luận frontend lỗi, gửi:

- Method: `GET`
- URL: `http://localhost:8080/api/courses?page=0&size=10`
- Authorization: `No Auth`

Kỳ vọng: `200 OK` và có `content`.

After-response script:

```javascript
pm.test("Gateway returns courses", () => pm.response.to.have.status(200));

const body = pm.response.json();
pm.expect(body.content).to.be.an("array");
```

Nếu Postman cũng lỗi, vấn đề nằm ở backend/Gateway, chưa phải React. Nếu Postman thành công nhưng browser lỗi, kiểm tra CORS, `.env` và DevTools.

## 13. Kiểm tra trong trình duyệt

### 13.1. Giao diện

Khi thành công, trang hiển thị:

- Tiêu đề kiểm tra kết nối.
- Thông báo `Kết nối thành công`.
- Số môn học của trang hiện tại.
- JSON Course.

### 13.2. DevTools Network

Nhấn `F12` → `Network` → reload trang. Chọn request `courses` và kiểm tra:

| Thuộc tính | Giá trị đúng |
| --- | --- |
| Request URL | `http://localhost:8080/api/courses?...` |
| Method | `GET` |
| Status | `200` |
| Origin | `http://localhost:5173` |
| Response | JSON có `content` |

### 13.3. CORS

Trình duyệt tự thêm Origin. Gateway phải trả header cho phép origin đó. Không cần tự thêm `Origin` trong Axios.

## 14. Build, lint và preview

```powershell
cd D:\course-service.demo1\crs-frontend
npm run lint
npm run build
```

Kết quả build nằm trong `crs-frontend/dist/` và không cần commit nếu `.gitignore` đã loại trừ.

Kiểm tra bản build local:

```powershell
npm run preview
```

Lưu ý Vite Preview có thể dùng cổng khác `5173`; khi đó CORS cần cho phép origin preview tương ứng. Dev server mới là yêu cầu chính của lab.

## 15. Mở rộng frontend

Các bước hợp lý tiếp theo:

1. Tạo React Router cho trang Course và Login.
2. Thêm `authApi.login(...)`.
3. Lưu token và role trong Auth Context.
4. Thêm Axios interceptor.
5. Tạo form Course chỉ hiển thị cho `ADMIN`.
6. Tạo nút đăng ký cho `STUDENT`.
7. Hiển thị pagination và ô tìm kiếm.

UI có thể ẩn nút theo role để dễ sử dụng, nhưng backend vẫn là nơi quyết định quyền thực sự.

## 16. Lỗi thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| Trang báo không kết nối được | Gateway hoặc Course chưa chạy | Kiểm tra `8080`, `8085` và Postman |
| Request đi tới `undefined/api/courses` | `.env` sai tên hoặc chưa restart Vite | Dùng `VITE_API_BASE_URL`, restart `npm run dev` |
| CORS error | Origin không đúng `localhost:5173` | Mở đúng URL hoặc sửa `FRONTEND_ORIGIN` rồi restart Gateway |
| `response.data.map is not a function` | Backend trả Page chứ không trả array | Dùng `response.data.content` |
| Browser gọi thẳng `8085` | Base URL/API module cấu hình sai | Đặt base URL là Gateway `8080` |
| Trang trống nhưng API `200` | Lỗi render/TypeScript ở console | Mở DevTools Console và kiểm tra data shape |
| `npm` không nhận lệnh | Node.js chưa cài hoặc terminal chưa reload PATH | Cài Node LTS và mở terminal mới |
| Port `5173` bận | Vite khác đang chạy | Dừng tiến trình cũ; giữ `5173` để khớp CORS |
| POST sau login trả `401` | Chưa gắn Bearer token | Bổ sung interceptor hoặc header request |

## 17. Git gợi ý

```powershell
cd D:\course-service.demo1
git status
git add crs-frontend LAB05.md README.md
git diff --cached
git commit -m "docs: complete lab 05 frontend guide"
git push origin main
```

Không commit:

- `node_modules/`
- Token JWT.
- Secret backend.
- Database password thật.
- File `.env` chứa secret. Biến base URL public có thể dùng `.env.example` nếu cần chia sẻ cấu hình.

## 18. Checklist hoàn thành

- [ ] `npm ci` hoặc `npm install` thành công.
- [ ] `.env` trỏ tới `http://localhost:8080`.
- [ ] Axios client là nơi duy nhất giữ base URL.
- [ ] Course API trả type `PagedResponse<Course>`.
- [ ] React đọc `response.data.content`.
- [ ] Có trạng thái loading, success và error.
- [ ] Frontend mở ở `http://localhost:5173`.
- [ ] Network request đi qua Gateway, không gọi thẳng Course Service.
- [ ] `npm run lint` thành công.
- [ ] `npm run build` thành công.

Tiếp theo: [LAB 06 — Danh sách môn học, tìm kiếm và phân trang](LAB06.md).
