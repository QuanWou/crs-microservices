import axios from 'axios'
import { useCallback, useState } from 'react'
import { useCourses } from '../api/useCourses'
import { registerCourse } from '../api/registrationApi'
import { useAuth } from '../auth/AuthContext'
import CourseList from '../components/CourseList'
import Pagination from '../components/Pagination'
import SearchBox from '../components/SearchBox'
import { useToast } from '../components/Toast'
import type { ApiErrorResponse } from '../types/apiError'
import type { Course } from '../types/course'

export default function RegisterCoursePage() {
  const [keyword, setKeyword] = useState(''); const [page, setPage] = useState(0); const [registeringId, setRegisteringId] = useState<number | null>(null)
  const { user } = useAuth(); const { courses, totalPages, totalElements, state, errorMessage, refetch } = useCourses(keyword, page, 5); const { showToast } = useToast()
  const handleSearch = useCallback((value: string) => { setKeyword(value); setPage(0) }, [])
  const handleRegister = async (course: Course) => {
    if (!user?.userId) { showToast('Phiên đăng nhập thiếu userId, vui lòng đăng nhập lại.', 'error'); return }
    setRegisteringId(course.id)
    try { await registerCourse({ studentId: user.userId, courseId: course.id }); showToast(`Đã đăng ký môn “${course.tenMonHoc}”.`); refetch() }
    catch (error) { const message = axios.isAxiosError<ApiErrorResponse>(error) ? error.response?.data?.message : undefined; showToast(message || 'Đăng ký thất bại, vui lòng thử lại.', 'error') }
    finally { setRegisteringId(null) }
  }
  return <main className="app-shell"><header className="page-header"><p className="eyebrow">CRS · Lab 09</p><h1>Đăng ký học phần</h1><p>Chọn môn còn chỗ để đăng ký.</p></header><section className="catalog-card"><div className="catalog-toolbar"><h2>Môn học có thể đăng ký</h2><SearchBox onSearch={handleSearch} /></div><div className="results-summary"><span><strong>{state === 'success' || state === 'empty' ? totalElements : '—'}</strong> môn học</span>{totalPages > 0 && <span className="page-summary">Trang {page + 1} / {totalPages}</span>}</div><CourseList courses={courses} state={state} errorMessage={errorMessage} keyword={keyword} onRetry={refetch} onRegister={handleRegister} registeringId={registeringId} />{state === 'success' && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}</section></main>
}
