import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminCoursesPage from './pages/AdminCoursesPage'
import CoursesPage from './pages/CoursesPage'
import LoginPage from './pages/LoginPage'
import RegisterCoursePage from './pages/RegisterCoursePage'
import MyRegistrationsPage from './pages/MyRegistrationsPage'
import { ToastProvider } from './components/Toast'
import './App.css'

export default function App() {
  return <BrowserRouter><AuthProvider><ToastProvider><Navbar /><Routes><Route path="/" element={<Navigate to="/courses" replace />} /><Route path="/login" element={<LoginPage />} /><Route path="/courses" element={<CoursesPage />} /><Route path="/admin/courses" element={<ProtectedRoute requiredRole="ADMIN"><AdminCoursesPage /></ProtectedRoute>} /><Route path="/register-course" element={<ProtectedRoute requiredRole="STUDENT"><RegisterCoursePage /></ProtectedRoute>} /><Route path="/my-registrations" element={<ProtectedRoute requiredRole="STUDENT"><MyRegistrationsPage /></ProtectedRoute>} /><Route path="*" element={<Navigate to="/courses" replace />} /></Routes></ToastProvider></AuthProvider></BrowserRouter>
}
