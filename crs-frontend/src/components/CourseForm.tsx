import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Course, CourseFormValues } from '../types/course'
import { emptyCourseForm } from '../types/course'

interface CourseFormProps {
  editingCourse: Course | null
  onSubmit: (values: CourseFormValues) => Promise<void>
  onCancel: () => void
  submitting: boolean
  serverError: string | null
}

export default function CourseForm({
  editingCourse,
  onSubmit,
  onCancel,
  submitting,
  serverError,
}: CourseFormProps) {
  const [values, setValues] = useState<CourseFormValues>(emptyCourseForm)
  const [clientErrors, setClientErrors] = useState<Partial<CourseFormValues>>({})

  useEffect(() => {
    setValues(
      editingCourse
        ? {
            tenMonHoc: editingCourse.tenMonHoc,
            soTinChi: String(editingCourse.soTinChi),
            soChoToiDa: String(editingCourse.soChoToiDa),
          }
        : emptyCourseForm,
    )
    setClientErrors({})
  }, [editingCourse])

  const setField = (field: keyof CourseFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setClientErrors((current) => ({ ...current, [field]: undefined }))
  }

  const validate = () => {
    const errors: Partial<CourseFormValues> = {}
    if (!values.tenMonHoc.trim()) errors.tenMonHoc = 'Tên môn học không được để trống'
    const credits = Number(values.soTinChi)
    if (!values.soTinChi || !Number.isFinite(credits) || credits <= 0) {
      errors.soTinChi = 'Số tín chỉ phải là số lớn hơn 0'
    }
    const seats = Number(values.soChoToiDa)
    if (!values.soChoToiDa || !Number.isFinite(seats) || seats <= 0) {
      errors.soChoToiDa = 'Số chỗ tối đa phải là số lớn hơn 0'
    }
    setClientErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (validate()) await onSubmit(values)
  }

  return (
    <form className="course-form" onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        <h2>{editingCourse ? 'Sửa môn học' : 'Thêm môn học'}</h2>
        <p>{editingCourse ? 'Cập nhật thông tin môn học.' : 'Tạo môn học mới trong hệ thống.'}</p>
      </div>
      <div className="form-grid">
        <label>
          Tên môn học
          <input value={values.tenMonHoc} onChange={(event) => setField('tenMonHoc', event.target.value)} />
          {clientErrors.tenMonHoc && <small className="field-error">{clientErrors.tenMonHoc}</small>}
        </label>
        <label>
          Số tín chỉ
          <input type="number" min="1" value={values.soTinChi} onChange={(event) => setField('soTinChi', event.target.value)} />
          {clientErrors.soTinChi && <small className="field-error">{clientErrors.soTinChi}</small>}
        </label>
        <label>
          Số chỗ tối đa
          <input type="number" min="1" value={values.soChoToiDa} onChange={(event) => setField('soChoToiDa', event.target.value)} />
          {clientErrors.soChoToiDa && <small className="field-error">{clientErrors.soChoToiDa}</small>}
        </label>
      </div>
      {serverError && <p className="form-error" role="alert">{serverError}</p>}
      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Đang lưu...' : editingCourse ? 'Cập nhật' : 'Thêm mới'}
        </button>
        {editingCourse && <button className="secondary-button" type="button" onClick={onCancel} disabled={submitting}>Hủy</button>}
      </div>
    </form>
  )
}
