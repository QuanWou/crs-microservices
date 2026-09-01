import axios from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/authApi'
import { useAuth } from '../auth/AuthContext'
import type { ApiErrorResponse } from '../types/apiError'

export default function LoginPage() {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false); const { login: saveLogin } = useAuth(); const navigate = useNavigate()
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setSubmitting(true); setError(''); try { const response = await login({ username, password }); saveLogin(response.data); navigate('/courses', { replace: true }) } catch (reason) { const message = axios.isAxiosError<ApiErrorResponse>(reason) ? reason.response?.data?.message : undefined; setError(message || 'Sai username hoặc password') } finally { setSubmitting(false) } }
  return <main className="auth-shell"><form className="login-card" onSubmit={handleSubmit}><p className="eyebrow">CRS · Login</p><h1>Đăng nhập</h1><label>Tài khoản<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label><label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button></form></main>
}
