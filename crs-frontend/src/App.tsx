import { useCallback, useState } from 'react'
import { useCourses } from './api/useCourses'
import CourseList from './components/CourseList'
import Pagination from './components/Pagination'
import SearchBox from './components/SearchBox'
import './App.css'

function App() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 10
  const {
    courses,
    totalPages,
    totalElements,
    state,
    errorMessage,
    refetch,
  } = useCourses(keyword, page, pageSize)

  const handleSearch = useCallback((newKeyword: string) => {
    setKeyword(newKeyword)
    setPage(0)
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    window.requestAnimationFrame(() => {
      document
        .getElementById('course-results')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="CRS - Trang chủ">
          <span className="brand-mark" aria-hidden="true">
            C
          </span>
          <span>
            <strong>CRS</strong>
            <small>Course Registration System</small>
          </span>
        </a>
        <div className="gateway-status">
          <span aria-hidden="true" />
          Kết nối qua API Gateway
        </div>
      </header>

      <section className="hero" id="top" aria-labelledby="page-title">
        <div className="hero-copy">
          <div className="eyebrow">Cổng thông tin học phần · Lab 06</div>
          <h1 id="page-title">
            Tìm môn học phù hợp cho <em>học kỳ của bạn.</em>
          </h1>
          <p>
            Tra cứu danh sách môn học, số tín chỉ và tình trạng chỗ trống theo
            dữ liệu mới nhất từ hệ thống.
          </p>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <span className="orbit-core">CRS</span>
        </div>
      </section>

      <section className="catalog-card" aria-labelledby="catalog-title">
        <div className="catalog-toolbar">
          <div>
            <span className="section-kicker">Danh mục đào tạo</span>
            <h2 id="catalog-title">Danh sách môn học</h2>
          </div>
          <SearchBox onSearch={handleSearch} />
        </div>

        <div className="results-summary" aria-live="polite">
          <div>
            <strong>
              {state === 'success' || state === 'empty'
                ? totalElements
                : '—'}
            </strong>
            <span>{keyword ? ` kết quả cho “${keyword}”` : ' môn học'}</span>
          </div>
          {totalPages > 0 && (
            <span className="page-summary">
              Trang {page + 1} / {totalPages}
            </span>
          )}
        </div>

        <div id="course-results" className="course-results" tabIndex={-1}>
          <CourseList
            courses={courses}
            state={state}
            errorMessage={errorMessage}
            keyword={keyword}
            onRetry={refetch}
          />
        </div>

        {state === 'success' && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </section>

      <footer className="site-footer">
        <p>CRS Microservices · Dữ liệu được cung cấp bởi Course Service</p>
        <span>Gateway :8080 · Frontend :5173</span>
      </footer>
    </main>
  )
}

export default App
