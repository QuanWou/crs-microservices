import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { cancelRegistration, getMyRegistrations } from '../api/registrationApi'
import { getCourseById } from '../api/courseApi'
import { useToast } from '../components/Toast'
import type { ApiErrorResponse } from '../types/apiError'
import type { Registration } from '../types/registration'

interface RegistrationRow { registration: Registration; courseName: string }

export default function MyRegistrationsPage() {
  const [rows, setRows] = useState<RegistrationRow[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [cancellingId, setCancellingId] = useState<number | null>(null); const { showToast } = useToast()
  const loadData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data } = await getMyRegistrations(); const active = data.filter((item) => item.trangThai === 'DA_DANG_KY')
      const result = await Promise.all(active.map(async (registration) => { try { const course = await getCourseById(registration.courseId); return { registration, courseName: course.data.tenMonHoc } } catch { return { registration, courseName: `Môn học #${registration.courseId} (không tìm thấy thông tin)` } } }))
      setRows(result)
    } catch (reason) { const message = axios.isAxiosError<ApiErrorResponse>(reason) ? reason.response?.data?.message : undefined; setError(message || 'Không thể tải danh sách đăng ký.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void loadData() }, [loadData])
  const handleCancel = async (row: RegistrationRow) => {
    if (!window.confirm(`Hủy đăng ký môn “${row.courseName}”?`)) return
    setCancellingId(row.registration.id)
    try { await cancelRegistration(row.registration.id); showToast('Đã hủy đăng ký.'); await loadData() }
    catch (reason) { const message = axios.isAxiosError<ApiErrorResponse>(reason) ? reason.response?.data?.message : undefined; showToast(message || 'Hủy đăng ký thất bại.', 'error') }
    finally { setCancellingId(null) }
  }
  return <main className="app-shell"><header className="page-header"><p className="eyebrow">CRS · Lab 09</p><h1>Môn học đã đăng ký</h1><p>Danh sách đăng ký của tài khoản hiện tại.</p></header><section className="catalog-card">{loading ? <div className="loading-state">Đang tải đăng ký...</div> : error ? <div className="feedback-state error-state" role="alert"><div><p>{error}</p><button className="retry-button" type="button" onClick={() => void loadData()}>Thử lại</button></div></div> : rows.length === 0 ? <div className="feedback-state empty-state">Bạn chưa đăng ký môn học nào.</div> : <div className="course-table-wrap"><table className="course-table"><thead><tr><th>Môn học</th><th>Ngày đăng ký</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rows.map((row) => <tr key={row.registration.id}><td data-label="Môn học"><div className="course-name">{row.courseName}</div></td><td data-label="Ngày đăng ký">{new Date(row.registration.ngayDangKy).toLocaleString('vi-VN')}</td><td data-label="Trạng thái">Đã đăng ký</td><td data-label="Thao tác"><button className="table-button danger-button" type="button" disabled={cancellingId === row.registration.id} onClick={() => void handleCancel(row)}>{cancellingId === row.registration.id ? 'Đang hủy...' : 'Hủy đăng ký'}</button></td></tr>)}</tbody></table></div>}</section></main>
}
