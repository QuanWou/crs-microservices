import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return <nav className="site-nav" aria-label="Điều hướng chính">
    <Link className="brand-link" to="/courses">CRS</Link>
    <div className="nav-links"><Link to="/courses">Môn học</Link>{user?.role === 'ADMIN' && <Link to="/admin/courses">Quản trị</Link>}{user?.role === 'STUDENT' && <><Link to="/register-course">Đăng ký học phần</Link><Link to="/my-registrations">Đã đăng ký</Link></>}</div>
    <div className="nav-account">{user ? <><span>{user.username} ({user.role})</span><button type="button" onClick={() => { logout(); navigate('/login') }}>Đăng xuất</button></> : <Link to="/login">Đăng nhập</Link>}</div>
  </nav>
}
