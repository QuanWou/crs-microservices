import { useCallback, useState } from 'react'
import { useCourses } from '../api/useCourses'
import CourseList from '../components/CourseList'
import Pagination from '../components/Pagination'
import SearchBox from '../components/SearchBox'

export default function CoursesPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const { courses, totalPages, totalElements, state, errorMessage, refetch } = useCourses(keyword, page, 10)
  const handleSearch = useCallback((value: string) => { setKeyword(value); setPage(0) }, [])
  return <main className="app-shell"><header className="page-header"><p className="eyebrow">CRS · Courses</p><h1>Danh sách môn học</h1><p>Tìm kiếm môn học và xem số chỗ còn lại.</p></header><section className="catalog-card" aria-labelledby="catalog-title"><div className="catalog-toolbar"><h2 id="catalog-title">Môn học hiện có</h2><SearchBox onSearch={handleSearch} /></div><div className="results-summary"><span><strong>{state === 'success' || state === 'empty' ? totalElements : '—'}</strong>{keyword ? ` kết quả cho “${keyword}”` : ' môn học'}</span>{totalPages > 0 && <span className="page-summary">Trang {page + 1} / {totalPages}</span>}</div><div className="course-results"><CourseList courses={courses} state={state} errorMessage={errorMessage} keyword={keyword} onRetry={refetch} /></div>{state === 'success' && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}</section></main>
}
