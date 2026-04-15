import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  LayoutDashboard, Users, FileText, Building2, CreditCard,
  BookOpen, DollarSign, CheckSquare, Car, LogOut, Settings,
  ChevronLeft, ChevronRight, X, Grid3x3
} from 'lucide-react'
import { useBreakpoint } from '../../hooks/useBreakpoint'

// Bottom-tab items (mobile primary nav)
const tabItems = [
  { to: '/polizas',   icon: FileText, label: 'Pólizas' },
  { to: '/vehiculos', icon: Car,      label: 'Vehículos' },
  { to: '/clientes',  icon: Users,    label: 'Clientes' },
]

// All nav items (sidebar + menu sheet)
const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',       end: true },
  { to: '/clientes',      icon: Users,           label: 'Clientes' },
  { to: '/polizas',       icon: FileText,        label: 'Pólizas' },
  { to: '/vehiculos',     icon: Car,             label: 'Vehículos' },
  { to: '/aseguradoras',  icon: Building2,       label: 'Aseguradoras' },
  { to: '/requerimientos',icon: CreditCard,      label: 'Requerimientos' },
  { to: '/liquidaciones', icon: BookOpen,        label: 'Liquidaciones' },
  { to: '/comisiones',    icon: DollarSign,      label: 'Comisiones' },
  { to: '/tareas',        icon: CheckSquare,     label: 'Tareas' },
  { to: '/configuracion', icon: Settings,        label: 'Configuración' },
]

// Items shown only in "Menú" sheet (all except the 3 tab items)
const menuSheetItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',       end: true },
  { to: '/aseguradoras',  icon: Building2,       label: 'Aseguradoras' },
  { to: '/requerimientos',icon: CreditCard,      label: 'Requerimientos' },
  { to: '/liquidaciones', icon: BookOpen,        label: 'Liquidaciones' },
  { to: '/comisiones',    icon: DollarSign,      label: 'Comisiones' },
  { to: '/tareas',        icon: CheckSquare,     label: 'Tareas' },
  { to: '/configuracion', icon: Settings,        label: 'Configuración' },
]

const SIDEBAR_EXPANDED = 240
const SIDEBAR_COLLAPSED = 64

export default function MainLayout({ session }) {
  const [collapsed, setCollapsed]   = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)
  const navigate    = useNavigate()
  const location    = useLocation()
  const { isMobile } = useBreakpoint()

  // Close menu sheet on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const w = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED

  /* ─── MOBILE LAYOUT ─────────────────────────────────────────── */
  if (isMobile) {
    const currentLabel = navItems.find(n =>
      n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
    )?.label || 'GGS'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F4F6F9' }}>

        {/* ── Top header ── */}
        <header style={{
          background: '#0C1E3D',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '12px',
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 150,
          flexShrink: 0,
        }}>
          <span style={{ background: '#C8A84B', color: '#0C1E3D', fontWeight: 800, fontSize: '12px', padding: '3px 7px', borderRadius: '5px' }}>GGS</span>
          <span style={{ color: 'white', fontSize: '15px', fontWeight: 600, flex: 1 }}>{currentLabel}</span>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session?.user?.email}
          </span>
        </header>

        {/* ── Main content ── */}
        <main style={{
          marginTop: '52px',
          marginBottom: '60px',
          flex: 1,
          padding: '12px',
          background: '#F4F6F9',
          boxSizing: 'border-box',
          minHeight: 'calc(100vh - 112px)',
        }}>
          <Outlet />
        </main>

        {/* ── Menu sheet overlay ── */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }}
          />
        )}

        {/* ── Menu sheet ── */}
        <div style={{
          position: 'fixed',
          bottom: menuOpen ? '60px' : '-100%',
          left: 0, right: 0,
          background: 'white',
          borderRadius: '20px 20px 0 0',
          zIndex: 210,
          transition: 'bottom 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {/* Sheet header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0C1E3D' }}>Menú</span>
            <button onClick={() => setMenuOpen(false)}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex' }}>
              <X size={16} color='#64748b' />
            </button>
          </div>

          {/* Sheet items grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', padding: '12px 16px' }}>
            {menuSheetItems.map(({ to, icon: Icon, label, end }) => {
              const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
              return (
                <NavLink key={to} to={to} end={end}
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', borderRadius: '12px', background: isActive ? '#EFF6FF' : 'transparent' }}
                  onClick={() => setMenuOpen(false)}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: isActive ? '#1A6BBA' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={isActive ? 'white' : '#64748b'} />
                  </div>
                  <span style={{ fontSize: '10px', color: isActive ? '#1A6BBA' : '#64748b', fontWeight: isActive ? 700 : 500, textAlign: 'center', lineHeight: '1.2' }}>{label}</span>
                </NavLink>
              )
            })}
          </div>

          {/* Logout row */}
          <div style={{ padding: '0 16px 16px' }}>
            <button onClick={handleLogout}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: '12px', cursor: 'pointer', color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>
              <LogOut size={18} color='#ef4444' />
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* ── Bottom tab bar ── */}
        <nav style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: '60px',
          background: 'white',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 190,
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        }}>
          {tabItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(to)
            return (
              <NavLink key={to} to={to}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', textDecoration: 'none', padding: '6px 0', color: isActive ? '#1A6BBA' : '#94a3b8' }}>
                <Icon size={22} color={isActive ? '#1A6BBA' : '#94a3b8'} strokeWidth={isActive ? 2.5 : 1.8} />
                <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500 }}>{label}</span>
              </NavLink>
            )
          })}

          {/* Menú button */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', color: menuOpen ? '#1A6BBA' : '#94a3b8' }}>
            <Grid3x3 size={22} color={menuOpen ? '#1A6BBA' : '#94a3b8'} strokeWidth={menuOpen ? 2.5 : 1.8} />
            <span style={{ fontSize: '10px', fontWeight: menuOpen ? 700 : 500 }}>Menú</span>
          </button>
        </nav>
      </div>
    )
  }

  /* ─── DESKTOP LAYOUT ─────────────────────────────────────────── */
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
            <button onClick={() => setCollapsed(true)} title="Contraer menú"
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ChevronLeft size={15} color='rgba(255,255,255,0.7)' />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', overflowX: 'hidden' }}>
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
          <button onClick={handleLogout} title="Cerrar sesión"
            style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', padding: '4px', borderRadius: '4px', cursor: 'pointer', border: 'none', flexShrink: 0 }}>
            <LogOut size={16} />
          </button>
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} title="Expandir menú"
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
