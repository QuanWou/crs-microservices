# LAB 06 — Danh sách môn học, tìm kiếm và phân trang

## 1. Mục tiêu

LAB 06 thay màn hình kiểm tra kết nối của LAB 05 bằng giao diện danh sách môn học hoàn chỉnh. Sau buổi này, frontend phải:

- Tách logic gọi API khỏi component hiển thị bằng custom hook `useCourses`.
- Tách giao diện thành `SearchBox`, `CourseList` và `Pagination`.
- Gọi `GET /api/courses` qua API Gateway với `keyword`, `page` và `size`.
- Debounce ô tìm kiếm để không gửi request sau mỗi phím bấm.
- Khi đổi từ khóa, luôn quay về trang đầu tiên.
- Xử lý rõ ràng bốn trạng thái `Loading`, `Success`, `Empty` và `Error`.
- Không crash hoặc giữ dữ liệu cũ gây hiểu nhầm khi Gateway/service bị dừng.
- Hoạt động tốt trên màn hình desktop và mobile.

## 2. Điều kiện trước khi làm

- Hoàn thành [LAB05.md](LAB05.md).
- `crs-frontend/.env` có `VITE_API_BASE_URL=http://localhost:8080`.
- Course Service chạy tại `8085`.
- API Gateway chạy tại `8080`.
- `GET http://localhost:8080/api/courses` trả `200 OK`.

Kiểm tra nhanh:

```powershell
Test-NetConnection localhost -Port 8080
Test-NetConnection localhost -Port 8085
```

Trong Postman:

```http
GET http://localhost:8080/api/courses?page=0&size=10
```

Response phải có `content`, `totalElements`, `totalPages`, `number` và `size`.

## 3. Vì sao phải có đủ bốn trạng thái?

| Trạng thái | Khi xảy ra | Giao diện hiện tại |
| --- | --- | --- |
| `loading` | Request đang chờ Gateway phản hồi | Spinner và thông báo đang tải |
| `success` | Request thành công, `content` có dữ liệu | Bảng môn học và phân trang |
| `empty` | Request thành công nhưng `content` rỗng | Thông báo không tìm thấy, không hiển thị bảng trống |
| `error` | Lỗi mạng, Gateway/service dừng hoặc HTTP lỗi | Thông báo thân thiện và nút `Thử lại` |

Nếu không tách `empty` khỏi `error`, người dùng không biết là không có kết quả hay hệ thống đang hỏng. Nếu không có `loading`, người dùng dễ nghĩ trang bị treo và bấm lặp nhiều lần.

## 4. Cấu trúc sau LAB 06

```text
crs-frontend/src/
├── api/
│   ├── axiosClient.ts
│   ├── courseApi.ts
│   └── useCourses.ts
├── components/
│   ├── CourseList.tsx
│   ├── Pagination.tsx
│   └── SearchBox.tsx
├── types/
│   ├── apiError.ts
│   └── course.ts
├── App.css
├── App.tsx
└── index.css
```

Phân chia trách nhiệm:

- `courseApi.ts`: định nghĩa lời gọi HTTP.
- `useCourses.ts`: quản lý request và trạng thái dữ liệu.
- `SearchBox.tsx`: nhập từ khóa và debounce.
- `CourseList.tsx`: hiển thị đúng một trong bốn trạng thái.
- `Pagination.tsx`: điều hướng trang.
- `App.tsx`: phối hợp các phần, giữ `keyword` và `page`.
- `App.css`: giao diện responsive và trạng thái trực quan.

## 5. Course API hỗ trợ hủy request cũ

`getCourses` nhận thêm `AbortSignal`:

```typescript
export const getCourses = (
  keyword?: string,
  page = 0,
  size = 10,
  signal?: AbortSignal,
) =>
  axiosClient.get<PagedResponse<Course>>('/api/courses', {
    params: { keyword, page, size },
    signal,
  })
```

Khi người dùng gõ nhanh hoặc chuyển trang, request cũ có thể trả về sau request mới. `AbortController` hủy request không còn cần thiết, tránh dữ liệu cũ ghi đè kết quả mới.

## 6. Custom hook `useCourses`

### 6.1. Contract

Hook nhận:

```typescript
useCourses(keyword: string, page: number, size = 10)
```

Hook trả:

| Giá trị | Ý nghĩa |
| --- | --- |
| `courses` | Các Course của trang hiện tại |
| `totalPages` | Tổng số trang từ backend |
| `totalElements` | Tổng số Course phù hợp |
| `state` | `loading`, `success`, `empty` hoặc `error` |
| `errorMessage` | Thông báo thân thiện khi lỗi |
| `refetch` | Gửi lại request hiện tại |

### 6.2. Trạng thái loading được suy ra từ request

Mỗi request có `queryKey` được tạo từ:

```typescript
[keyword, page, size, requestVersion]
```

Nếu dữ liệu đang giữ không thuộc `queryKey` hiện tại, hook trả trạng thái `loading`. Cách này tránh phải gọi `setState` đồng bộ ngay đầu `useEffect`, giảm một render thừa và không giữ dữ liệu cũ trên màn hình.

### 6.3. Xác định success và empty

```typescript
state: data.content.length === 0 ? 'empty' : 'success'
```

`200 OK` với `content: []` là `empty`, không phải lỗi.

### 6.4. Xử lý lỗi

Thứ tự chọn thông báo:

1. Backend có `response.data.message`: hiển thị message đó.
2. Không có response: báo không kết nối được tới Gateway.
3. Có HTTP status nhưng không có message: hiển thị status và lời nhắc thử lại.
4. Lỗi không xác định: dùng thông báo dự phòng.

Request bị hủy bởi `AbortController` không được hiển thị như lỗi cho người dùng.

### 6.5. Nút thử lại

`refetch()` tăng `requestVersion`, tạo `queryKey` mới và chạy lại đúng request với từ khóa/trang hiện tại.

## 7. SearchBox có debounce

`SearchBox` giữ giá trị người dùng đang gõ trong state nội bộ. Sau 450 ms không có phím mới, component gọi:

```typescript
onSearch(inputValue.trim())
```

Mỗi lần input thay đổi, cleanup hủy timer cũ:

```typescript
return () => window.clearTimeout(timer)
```

Ví dụ người dùng gõ `java` liên tục trong dưới 450 ms thì chỉ có một request tìm kiếm sau khi ngừng gõ, không phải bốn request.

Nút xóa ở cuối input đặt từ khóa về chuỗi rỗng và tải lại danh sách đầy đủ.

## 8. Pagination

Component dùng page index giống Spring Data:

- Trang đầu tiên có index `0` nhưng hiển thị cho người dùng là `1`.
- Nút `Trang trước` bị khóa ở trang đầu.
- Nút `Trang sau` bị khóa ở trang cuối.
- Trang đang chọn có `aria-current="page"`.
- Nếu chỉ có một trang, toàn bộ pagination được ẩn.

Với tối đa bảy trang, hiển thị toàn bộ số trang. Với danh sách dài hơn, component rút gọn bằng dấu `…`, ví dụ:

```text
1 … 5 6 7 … 20
```

Khi chuyển trang, giao diện cuộn nhẹ về đầu vùng kết quả.

## 9. CourseList và bốn trạng thái

### 9.1. Loading

Hiển thị spinner có `role="status"` và thông báo dữ liệu đang được lấy qua Gateway.

### 9.2. Error

Hiển thị:

- Tiêu đề `Chưa thể tải dữ liệu`.
- Message đã được hook chuẩn hóa.
- Nút `Thử lại` gọi `refetch`.
- `role="alert"` để công nghệ hỗ trợ đọc lỗi.

### 9.3. Empty

Nếu có từ khóa, thông báo nhắc đúng từ khóa đang tìm. Nếu database chưa có Course, thông báo danh sách chưa có dữ liệu.

### 9.4. Success

Bảng hiển thị:

| Cột | Dữ liệu |
| --- | --- |
| Môn học | `tenMonHoc` và ID hệ thống |
| Tín chỉ | `soTinChi` |
| Sức chứa | `soChoConLai / soChoToiDa` và thanh mức sử dụng |
| Tình trạng | `Đang mở` hoặc `Đã đủ chỗ` |

Khi `soChoConLai === 0`, trạng thái chuyển sang màu cảnh báo. Chi tiết này chuẩn bị cho nút đăng ký ở buổi tiếp theo.

Trên màn hình nhỏ, mỗi dòng bảng chuyển thành card hai cột để không phải kéo ngang.

## 10. App phối hợp các component

`App` giữ hai state điều khiển request:

```typescript
const [keyword, setKeyword] = useState('')
const [page, setPage] = useState(0)
```

Khi tìm kiếm:

```typescript
const handleSearch = useCallback((newKeyword: string) => {
  setKeyword(newKeyword)
  setPage(0)
}, [])
```

`setPage(0)` là bắt buộc. Nếu người dùng đang ở trang 4 rồi tìm một từ chỉ có một trang kết quả, giữ page 4 sẽ làm response rỗng và gây hiểu nhầm.

App còn hiển thị:

- Tổng số kết quả.
- Từ khóa hiện tại.
- Trang hiện tại trên tổng số trang.
- Trạng thái kết nối qua API Gateway.

## 11. Chạy ứng dụng

### Backend tối thiểu

Trong IntelliJ:

1. Chạy Course Service ở `8085`.
2. Chạy API Gateway ở `8080`.

Auth và Registration không bắt buộc cho màn hình danh sách public này.

### Frontend

```powershell
cd D:\course-service.demo1\crs-frontend
npm run dev
```

Mở:

```text
http://localhost:5173
```

Không dùng `127.0.0.1:5173` nếu CORS Gateway chỉ cho phép `http://localhost:5173`.

## 12. Chuẩn bị dữ liệu kiểm thử

Để quan sát phân trang với `size = 10`, database cần ít nhất 11 Course. Dùng luồng POST Course bằng admin token đã hướng dẫn tại [LAB04.md](LAB04.md).

Request:

```http
POST http://localhost:8080/api/courses
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

```json
{
  "tenMonHoc": "Môn học kiểm thử phân trang 01",
  "soTinChi": 3,
  "soChoToiDa": 30
}
```

Đổi tên cho mỗi request để không trùng. Không cần gửi `soChoConLai`; backend tự gán bằng `soChoToiDa`.

## 13. Kịch bản kiểm thử thủ công

### Test 1 — Loading → Success

1. Đảm bảo Gateway và Course Service đang chạy.
2. Mở trang hoặc nhấn `F5`.

Kỳ vọng:

- Thông báo loading xuất hiện trong lúc chờ.
- Sau đó bảng Course xuất hiện.
- Tổng kết quả khớp `totalElements` của API.

### Test 2 — Search debounce

1. Mở DevTools → Network.
2. Gõ nhanh một từ, ví dụ `java`.
3. Quan sát request `/api/courses`.

Kỳ vọng:

- Request chỉ được gửi sau khoảng 450 ms ngừng gõ.
- Không gửi một request cho từng ký tự.

### Test 3 — Empty

Nhập từ khóa chắc chắn không tồn tại:

```text
zzz123-khong-ton-tai
```

Kỳ vọng:

- Hiển thị `Không tìm thấy môn học`.
- Message có từ khóa vừa nhập.
- Không xuất hiện bảng rỗng hoặc lỗi kỹ thuật.

### Test 4 — Xóa tìm kiếm

Nhấn nút `×` trong ô tìm kiếm.

Kỳ vọng:

- Danh sách đầy đủ quay lại.
- Trang được đặt về trang 1.

### Test 5 — Pagination

Điều kiện: có ít nhất 11 Course.

1. Nhấn `Trang sau` hoặc số trang 2.
2. Quan sát URL request trong DevTools.

Kỳ vọng:

- Request có `page=1`.
- Dữ liệu đổi sang trang 2.
- Trang 2 có trạng thái đang chọn.
- Nút sau bị khóa khi ở trang cuối.

### Test 6 — Error khi Gateway dừng

1. Dừng API Gateway trong IntelliJ.
2. Thay đổi từ khóa hoặc reload trang.

Kỳ vọng:

- Hiển thị lỗi không kết nối được tới Gateway.
- Có nút `Thử lại`.
- Không crash trắng trang.
- Không giữ dữ liệu cũ như thể nó vẫn còn đúng.

### Test 7 — Retry

1. Khởi động lại Gateway.
2. Nhấn `Thử lại`.

Kỳ vọng: request chạy lại và bảng hiển thị thành công.

### Test 8 — Responsive

Trong DevTools bật chế độ thiết bị và thử chiều rộng khoảng 390 px.

Kỳ vọng:

- Không có nội dung tràn ngang toàn trang.
- Bảng chuyển thành card.
- Search, phân trang và nút thử lại vẫn sử dụng được.

## 14. Kiểm tra bằng Postman trước khi sửa frontend

Nếu giao diện báo lỗi, kiểm tra API độc lập:

```http
GET http://localhost:8080/api/courses?keyword=java&page=0&size=10
```

After-response script:

```javascript
pm.test("Course search succeeds", () => {
  pm.response.to.have.status(200)
})

const body = pm.response.json()
pm.expect(body.content).to.be.an("array")
pm.expect(body.totalPages).to.be.a("number")
pm.expect(body.totalElements).to.be.a("number")
```

Nếu Postman lỗi, sửa Gateway/Course Service trước. Nếu Postman thành công nhưng browser lỗi, kiểm tra `.env`, CORS và DevTools Console.

## 15. Lint và build

```powershell
cd D:\course-service.demo1\crs-frontend
npm run lint
npm run build
```

Hai lệnh phải hoàn thành không có lỗi TypeScript hoặc lint.

## 16. Lỗi thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| Gõ tìm kiếm tạo nhiều request | Thiếu debounce hoặc không clear timer | Kiểm tra cleanup trong `SearchBox` |
| Tìm kiếm từ trang sau cho kết quả rỗng | Quên `setPage(0)` | Reset page trong `handleSearch` |
| Loading không kết thúc | Thiếu xử lý success/error | Kiểm tra cả `.then` và `.catch` trong hook |
| Dữ liệu cũ ghi đè dữ liệu mới | Request cũ không bị hủy | Truyền `AbortSignal` cho Axios |
| Empty bị hiển thị như Error | Chỉ kiểm tra mảng rỗng trong catch | Dùng `content.length === 0 ? 'empty' : 'success'` |
| Pagination xuất hiện khi một trang | Thiếu guard | `if (totalPages <= 1) return null` |
| Error hiện `Network Error` thô | Chưa map nhánh `!error.response` | Dùng thông báo kết nối thân thiện |
| Search API thành công nhưng bảng không hiện | Đọc sai shape response | Dữ liệu nằm ở `response.data.content` |
| CORS trong browser nhưng Postman được | Origin không khớp | Chạy đúng `localhost:5173`, kiểm tra Gateway |
| `npm run build` báo type của Axios signal | Signature `getCourses` chưa nhận `AbortSignal` | Đồng bộ `courseApi.ts` và `useCourses.ts` |

## 17. Tiêu chí hoàn thành

- [ ] Có custom hook `useCourses`.
- [ ] Logic HTTP không nằm trực tiếp trong `CourseList`.
- [ ] Search debounce 450 ms và có cleanup timer.
- [ ] Tìm kiếm mới luôn đặt `page = 0`.
- [ ] Request cũ bị hủy khi query thay đổi.
- [ ] Loading có thông báo rõ ràng.
- [ ] Success hiển thị bảng Course.
- [ ] Empty có thông báo riêng.
- [ ] Error có message thân thiện và nút thử lại.
- [ ] Pagination đồng bộ với page index của Spring Data.
- [ ] Hết chỗ được hiển thị bằng trạng thái cảnh báo.
- [ ] Giao diện sử dụng được trên mobile.
- [ ] `npm run lint` thành công.
- [ ] `npm run build` thành công.

## 18. Git gợi ý

```powershell
cd D:\course-service.demo1
git status
git add crs-frontend LAB06.md README.md LAB05.md
git diff --cached
git commit -m "feat: course list with search and pagination"
git push origin main
```

Chỉ commit sau khi đã xem diff và xác nhận không có token hoặc secret.

