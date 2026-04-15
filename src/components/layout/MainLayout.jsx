import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { LayoutDashboard, Users, FileText, Building2, CreditCard, BookOpen, DollarSign, CheckSquare, Car, LogOut, Settings, ChevronLeft, ChevronRight } from 'lucide-react'

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
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
]

const SIDEBAR_EXPANDED = 240
const SIDEBAR_COLLAPSED = 64

export default function MainLayout({ session }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const w = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: `${w}px`,
        background: '#0C1E3D',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0,
        height: '100vh',
        zIndex: 100,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}>

        {/* Logo + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '20px 0' : '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <span style={{ background: '#C8A84B', color: '#0C1E3D', fontWeight: 700, fontSize: '13px', padding: '4px 8px', borderRadius: '6px', flexShrink: 0 }}>GGS</span>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap' }}>Grupo Global</span>
            </div>
          )}
          {collapsed && (
            <span style={{ background: '#C8A84B', color: '#0C1E3D', fontWeight: 700, fontSize: '13px', padding: '4px 8px', borderRadius: '6px' }}>GGS</span>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)}
              title="Contraer menú"
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ChevronLeft size={15} color='rgba(255,255,255,0.7)' />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: collapsed ? '12px 8px' : '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', overflowX: 'hidden' }}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              title={collapsed ? label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '10px',
                padding: collapsed ? '10px 0' : '10px 12px',
                borderRadius: '8px',
                color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                background: isActive ? '#1A6BBA' : 'transparent',
                fontSize: '14px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}>
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: collapsed ? '12px 8px' : '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', flexShrink: 0, gap: '8px' }}>
          {!collapsed && (
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {session?.user?.email}
            </span>
          )}
          <button onClick={handleLogout} title="Cerrar sesión" style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', padding: '4px', borderRadius: '4px', cursor: 'pointer', border: 'none', flexShrink: 0 }}>
            <LogOut size={16} />
          </button>
        </div>

        {/* Expand button — visible only when collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)}
            title="Expandir menú"
            style={{ margin: '0 8px 12px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', padding: '7px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronRight size={15} color='rgba(255,255,255,0.7)' />
          </button>
        )}
      </aside>

      {/* Main content */}
      <main style={{
        marginLeft: `${w}px`,
        flex: 1,
        padding: '24px',
        minHeight: '100vh',
        background: '#F4F6F9',
        boxSizing: 'border-box',
        transition: 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <Outlet />
      </main>
    </div>
  )
}
