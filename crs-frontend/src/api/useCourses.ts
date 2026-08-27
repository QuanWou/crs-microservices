import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import type { ApiErrorResponse } from '../types/apiError'
import type { Course } from '../types/course'
import { getCourses } from './courseApi'

export type LoadState = 'loading' | 'success' | 'empty' | 'error'

interface CoursesState {
  queryKey: string | null
  courses: Course[]
  totalPages: number
  totalElements: number
  state: LoadState
  errorMessage: string
}

const initialState: CoursesState = {
  queryKey: null,
  courses: [],
  totalPages: 0,
  totalElements: 0,
  state: 'loading',
  errorMessage: '',
}

export function useCourses(keyword: string, page: number, size = 10) {
  const [coursesState, setCoursesState] = useState<CoursesState>(initialState)
  const [requestVersion, setRequestVersion] = useState(0)
  const queryKey = JSON.stringify([keyword, page, size, requestVersion])

  const refetch = useCallback(() => {
    setRequestVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    getCourses(keyword, page, size, controller.signal)
      .then(({ data }) => {
        setCoursesState({
          queryKey,
          courses: data.content,
          totalPages: data.totalPages,
          totalElements: data.totalElements,
          state: data.content.length === 0 ? 'empty' : 'success',
          errorMessage: '',
        })
      })
      .catch((error: unknown) => {
        if (axios.isCancel(error)) {
          return
        }

        let errorMessage =
          'Đã xảy ra lỗi khi tải danh sách môn học. Vui lòng thử lại.'

        if (axios.isAxiosError<ApiErrorResponse>(error)) {
          if (error.response?.data?.message) {
            errorMessage = error.response.data.message
          } else if (!error.response) {
            errorMessage =
              'Không kết nối được tới hệ thống. Hãy kiểm tra API Gateway ở cổng 8080.'
          } else {
            errorMessage = `Không thể tải dữ liệu (HTTP ${error.response.status}). Vui lòng thử lại.`
          }
        }

        setCoursesState({
          queryKey,
          courses: [],
          totalPages: 0,
          totalElements: 0,
          state: 'error',
          errorMessage,
        })
      })

    return () => controller.abort()
  }, [keyword, page, queryKey, size])

  if (coursesState.queryKey !== queryKey) {
    return { ...initialState, refetch }
  }

  return { ...coursesState, refetch }
}
