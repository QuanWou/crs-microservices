import { useEffect, useState } from 'react'
import { getCourses } from './api/courseApi'
import type { Course } from './types/course'
import './App.css'

function App() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <main className="app-shell">
      <section className="connection-card" aria-labelledby="page-title">
        <div className="eyebrow">CRS Microservices · Lab 05</div>
        <h1 id="page-title">Kiểm tra kết nối qua API Gateway</h1>
        <p className="description">
          Frontend chỉ gọi <code>/api/courses</code>. Gateway chịu trách nhiệm
          định tuyến đến Course Service.
        </p>

        {isLoading && <p className="status status-loading">Đang tải dữ liệu…</p>}

        {error && (
          <p className="status status-error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && !error && (
          <>
            <div className="status status-success">
              Kết nối thành công · {courses.length} môn học trên trang hiện tại
            </div>
            <pre aria-label="Dữ liệu môn học">
              {JSON.stringify(courses, null, 2)}
            </pre>
          </>
        )}
      </section>
    </main>
  )
}

export default App
