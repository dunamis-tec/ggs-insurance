import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  LayoutDashboard, Users, FileText, Building2,
  CreditCard, BookOpen, DollarSign, CheckSquare, LogOut
} from 'lucide-react'
import './MainLayout.css'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/polizas', icon: FileText, label: 'Pólizas' },
  { to: '/aseguradoras', icon: Building2, label: 'Aseguradoras' },
  { to: '/requerimientos', icon: CreditCard, label: 'Requerimientos' },
  { to: '/liquidaciones', icon: BookOpen, label: 'Liquidaciones' },
  { to: '/comisiones', icon: DollarSign, label: 'Comisiones' },
  { to: '/tareas', icon: CheckSquare, label: 'Tareas' },
]

export default function MainLayout({ session }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-badge">GGS</span>
          <span className="logo-text">Grupo Global</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="user-email">{session?.user?.email}</span>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}