import axiosClient from './axiosClient'
import type { LoginRequest, LoginResponse } from '../types/auth'

export const login = (credentials: LoginRequest) =>
  axiosClient.post<LoginResponse>('/api/auth/login', credentials)
