import axiosClient from './axiosClient'
import type { Registration, RegistrationRequest } from '../types/registration'

export const registerCourse = (request: RegistrationRequest) =>
  axiosClient.post<Registration>('/api/registrations', request)

export const getMyRegistrations = () =>
  axiosClient.get<Registration[]>('/api/registrations/my')

export const cancelRegistration = (id: number) =>
  axiosClient.delete(`/api/registrations/${id}`)
