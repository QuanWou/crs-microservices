import type { LoadState } from '../api/useCourses'
import type { Course } from '../types/course'

interface CourseListProps {
  courses: Course[]
  state: LoadState
  errorMessage: string
  keyword?: string
  onRetry: () => void
  onEdit?: (course: Course) => void
  onDelete?: (course: Course) => void
  onRegister?: (course: Course) => void
  registeringId?: number | null
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
  onEdit,
  onDelete,
  onRegister,
  registeringId,
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
            {(onEdit || onDelete || onRegister) && <th scope="col">Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => {
            const isFull = course.soChoConLai === 0

            return (
              <tr key={course.id}>
                <td data-label="Môn học">
                  <div className="course-name">{course.tenMonHoc}</div>
                </td>
                <td data-label="Tín chỉ">
                  {course.soTinChi}
                </td>
                <td className={isFull ? 'no-seats' : ''} data-label="Số chỗ">
                  {course.soChoConLai} / {course.soChoToiDa}
                </td>
                <td data-label="Tình trạng">
                  <span
                    className={`availability-badge ${isFull ? 'is-full' : 'is-open'}`}
                  >
                    <span aria-hidden="true" />
                    {isFull ? 'Đã đủ chỗ' : 'Đang mở'}
                  </span>
                </td>
                {(onEdit || onDelete || onRegister) && (
                  <td data-label="Thao tác" className="row-actions">
                    {onEdit && <button className="table-button" type="button" onClick={() => onEdit(course)}>Sửa</button>}
                    {onDelete && <button className="table-button danger-button" type="button" onClick={() => onDelete(course)}>Xóa</button>}
                    {onRegister && <button className="table-button register-button" type="button" disabled={isFull || registeringId === course.id} onClick={() => onRegister(course)}>{registeringId === course.id ? 'Đang đăng ký...' : 'Đăng ký'}</button>}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
