import axios from 'axios'
import { useCallback, useState } from 'react'
import { useCourses } from '../api/useCourses'
import { createCourse, deleteCourse, updateCourse } from '../api/courseApi'
import CourseForm from '../components/CourseForm'
import CourseList from '../components/CourseList'
import Pagination from '../components/Pagination'
import SearchBox from '../components/SearchBox'
import type { ApiErrorResponse } from '../types/apiError'
import type { Course, CourseFormValues } from '../types/course'

export default function AdminCoursesPage() {
  const [keyword, setKeyword] = useState(''); const [page, setPage] = useState(0); const [editingCourse, setEditingCourse] = useState<Course | null>(null); const [isFormOpen, setIsFormOpen] = useState(false); const [submitting, setSubmitting] = useState(false); const [formError, setFormError] = useState<string | null>(null)
  const { courses, totalPages, totalElements, state, errorMessage, refetch } = useCourses(keyword, page, 10)
  const extractErrorMessage = (error: unknown) => { if (axios.isAxiosError<ApiErrorResponse>(error)) { const data = error.response?.data; if (data?.message) return data.message; if (data) { const fieldError = Object.values(data).find((value) => typeof value === 'string'); if (fieldError) return fieldError }; if (!error.response) return 'Không kết nối được tới API Gateway (cổng 8080).'; return `Thao tác thất bại (HTTP ${error.response.status}).` }; return 'Đã xảy ra lỗi, vui lòng thử lại.' }
  const handleSubmit = async (values: CourseFormValues) => { setSubmitting(true); setFormError(null); try { if (editingCourse) await updateCourse(editingCourse.id, values); else await createCourse(values); setEditingCourse(null); setIsFormOpen(false); refetch() } catch (error) { setFormError(extractErrorMessage(error)) } finally { setSubmitting(false) } }
  const handleDelete = async (course: Course) => { if (!window.confirm(`Xóa môn học “${course.tenMonHoc}”?`)) return; try { await deleteCourse(course.id); refetch() } catch (error) { window.alert(extractErrorMessage(error)) } }
  const handleSearch = useCallback((value: string) => { setKeyword(value); setPage(0) }, [])
  return <main className="app-shell"><header className="page-header"><p className="eyebrow">CRS · Lab 08</p><h1>Quản lý môn học</h1><p>Chức năng quản trị chỉ dành cho tài khoản ADMIN.</p></header><section className="catalog-card" aria-labelledby="admin-catalog-title">{isFormOpen && <CourseForm editingCourse={editingCourse} onSubmit={handleSubmit} onCancel={() => { setEditingCourse(null); setIsFormOpen(false); setFormError(null) }} submitting={submitting} serverError={formError} />}<div className="catalog-toolbar"><h2 id="admin-catalog-title">Môn học hiện có</h2>{!isFormOpen && <button className="primary-button add-button" type="button" onClick={() => { setEditingCourse(null); setFormError(null); setIsFormOpen(true) }}>+ Thêm môn học</button>}<SearchBox onSearch={handleSearch} /></div><div className="results-summary"><span><strong>{state === 'success' || state === 'empty' ? totalElements : '—'}</strong>{keyword ? ` kết quả cho “${keyword}”` : ' môn học'}</span>{totalPages > 0 && <span className="page-summary">Trang {page + 1} / {totalPages}</span>}</div><div className="course-results"><CourseList courses={courses} state={state} errorMessage={errorMessage} keyword={keyword} onRetry={refetch} onEdit={(course) => { setEditingCourse(course); setFormError(null); setIsFormOpen(true) }} onDelete={handleDelete} /></div>{state === 'success' && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}</section></main>
}
