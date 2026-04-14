import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { LayoutDashboard, Users, FileText, Building2, CreditCard, BookOpen, DollarSign, CheckSquare, Car, LogOut } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/polizas', icon: FileText, label: 'Pólizas' },
  { to: '/vehiculos', icon: Car, label: 'Vehículos' },
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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: '240px', background: '#0C1E3D', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ background: '#C8A84B', color: '#0C1E3D', fontWeight: 700, fontSize: '13px', padding: '4px 8px', borderRadius: '6px' }}>GGS</span>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>Grupo Global</span>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
              borderRadius: '8px', color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
              background: isActive ? '#1A6BBA' : 'transparent', fontSize: '14px', textDecoration: 'none'
            })}>
              <Icon size={18} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{session?.user?.email}</span>
          <button onClick={handleLogout} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', padding: '4px', borderRadius: '4px', cursor: 'pointer', border: 'none' }}><LogOut size={16} /></button>
        </div>
      </aside>
      <main style={{ marginLeft: '240px', flex: 1, padding: '24px', minHeight: '100vh', background: '#F4F6F9', boxSizing: 'border-box' }}>
        <Outlet />
      </main>
    </div>
  )
}