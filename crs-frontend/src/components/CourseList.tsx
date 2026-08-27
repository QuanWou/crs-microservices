import type { LoadState } from '../api/useCourses'
import type { Course } from '../types/course'

interface CourseListProps {
  courses: Course[]
  state: LoadState
  errorMessage: string
  keyword: string
  onRetry: () => void
}

function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <div>
        <strong>Đang tải danh sách môn học</strong>
        <p>Dữ liệu đang được lấy qua API Gateway.</p>
      </div>
    </div>
  )
}

export default function CourseList({
  courses,
  state,
  errorMessage,
  keyword,
  onRetry,
}: CourseListProps) {
  if (state === 'loading') {
    return <LoadingState />
  }

  if (state === 'error') {
    return (
      <div className="feedback-state error-state" role="alert">
        <span className="feedback-icon" aria-hidden="true">
          !
        </span>
        <div>
          <h2>Chưa thể tải dữ liệu</h2>
          <p>{errorMessage}</p>
          <button className="retry-button" type="button" onClick={onRetry}>
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div className="feedback-state empty-state" role="status">
        <span className="feedback-icon" aria-hidden="true">
          0
        </span>
        <div>
          <h2>Không tìm thấy môn học</h2>
          <p>
            {keyword
              ? `Không có kết quả phù hợp với “${keyword}”. Hãy thử một từ khóa khác.`
              : 'Danh sách môn học hiện chưa có dữ liệu.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="course-table-wrap">
      <table className="course-table">
        <thead>
          <tr>
            <th scope="col">Môn học</th>
            <th scope="col">Tín chỉ</th>
            <th scope="col">Sức chứa</th>
            <th scope="col">Tình trạng</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => {
            const isFull = course.soChoConLai === 0
            const fillPercentage = Math.min(
              100,
              Math.max(
                0,
                ((course.soChoToiDa - course.soChoConLai) /
                  course.soChoToiDa) *
                  100,
              ),
            )

            return (
              <tr key={course.id}>
                <td data-label="Môn học">
                  <div className="course-name">{course.tenMonHoc}</div>
                  <div className="course-id">Mã hệ thống #{course.id}</div>
                </td>
                <td data-label="Tín chỉ">
                  <span className="credit-badge">{course.soTinChi}</span>
                </td>
                <td data-label="Sức chứa">
                  <div className="capacity-copy">
                    <strong>{course.soChoConLai}</strong>
                    <span>/ {course.soChoToiDa} chỗ còn lại</span>
                  </div>
                  <div className="capacity-track" aria-hidden="true">
                    <span style={{ width: `${fillPercentage}%` }} />
                  </div>
                </td>
                <td data-label="Tình trạng">
                  <span
                    className={`availability-badge ${isFull ? 'is-full' : 'is-open'}`}
                  >
                    <span aria-hidden="true" />
                    {isFull ? 'Đã đủ chỗ' : 'Đang mở'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
