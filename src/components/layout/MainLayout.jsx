import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  LayoutDashboard, Users, FileText, Building2, CreditCard,
  BookOpen, DollarSign, CheckSquare, Car, LogOut, Settings,
  X, Grid3x3, ChevronDown
} from 'lucide-react'
import { useBreakpoint } from '../../hooks/useBreakpoint'

const NAV_HEIGHT = 54

// Primary nav — always visible in top bar
const primaryNavItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/polizas',   icon: FileText,        label: 'Pólizas' },
  { to: '/vehiculos', icon: Car,             label: 'Vehículos' },
  { to: '/clientes',  icon: Users,           label: 'Clientes' },
]

// Secondary nav — hidden inside "Menú" dropdown
const menuDropdownItems = [
  { to: '/aseguradoras',  icon: Building2,   label: 'Aseguradoras' },
  { to: '/requerimientos',icon: CreditCard,  label: 'Requerimientos' },
  { to: '/liquidaciones', icon: BookOpen,    label: 'Liquidaciones' },
  { to: '/comisiones',    icon: DollarSign,  label: 'Comisiones' },
  { to: '/tareas',        icon: CheckSquare, label: 'Tareas' },
  { to: '/configuracion', icon: Settings,    label: 'Configuración' },
]

// All nav items (used in mobile)
const navItems = [...primaryNavItems, ...menuDropdownItems]

// Bottom-tab items (mobile)
const tabItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/polizas',   icon: FileText,        label: 'Pólizas' },
  { to: '/vehiculos', icon: Car,             label: 'Vehículos' },
  { to: '/clientes',  icon: Users,           label: 'Clientes' },
]

// Menu sheet items (mobile — everything not in tab bar)
const menuSheetItems = menuDropdownItems

export default function MainLayout({ session }) {
  const [menuOpen, setMenuOpen]           = useState(false)
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false)
  const [companyLogo, setCompanyLogo]     = useState(null)
  const navigate    = useNavigate()
  const location    = useLocation()
  const { isMobile } = useBreakpoint()
  const menuBtnRef  = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    supabase.from('configuracion_empresa').select('logo_url').single()
      .then(({ data }) => { if (data?.logo_url) setCompanyLogo(data.logo_url) })
  }, [])

  useEffect(() => {
    const handler = (e) => setCompanyLogo(e.detail || null)
    window.addEventListener('companyLogoUpdated', handler)
    return () => window.removeEventListener('companyLogoUpdated', handler)
  }, [])

  // Close mobile menu and desktop dropdown on route change
  useEffect(() => {
    setMenuOpen(false)
    setDesktopMenuOpen(false)
  }, [location.pathname])

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    if (!desktopMenuOpen) return
    const handleClick = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        menuBtnRef.current  && !menuBtnRef.current.contains(e.target)
      ) {
        setDesktopMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [desktopMenuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // Is any dropdown item currently active?
  const isDropdownActive = menuDropdownItems.some(item =>
    location.pathname.startsWith(item.to)
  )

  /* ─── MOBILE LAYOUT ─────────────────────────────────────────── */
  if (isMobile) {
    const currentLabel = navItems.find(n =>
      n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
    )?.label || 'GGS'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F7F5F2' }}>

        {/* Top header */}
        <header style={{
          background: '#111111',
          height: '52px',
          display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: '12px',
          position: 'fixed', top: 0, left: 0, right: 0,
          zIndex: 150, flexShrink: 0,
        }}>
          {companyLogo
            ? <img src={companyLogo} alt="Logo" style={{ height: '32px', width: '32px', objectFit: 'contain', borderRadius: '5px', background: 'white', padding: '2px' }} />
            : <img src="/ggs-icon.svg" alt="GGS" style={{ height: '28px', width: 'auto' }} />
          }
          <span style={{ color: 'white', fontSize: '15px', fontWeight: 600, flex: 1 }}>{currentLabel}</span>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session?.user?.email}
          </span>
        </header>

        {/* Main content */}
        <main style={{ marginTop: '52px', marginBottom: '60px', flex: 1, padding: '12px', background: '#F7F5F2', boxSizing: 'border-box', minHeight: 'calc(100vh - 112px)' }}>
          <Outlet />
        </main>

        {/* Menu sheet overlay */}
        {menuOpen && (
          <div onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }} />
        )}

        {/* Menu sheet */}
        <div style={{
          position: 'fixed',
          bottom: menuOpen ? '60px' : '-100%',
          left: 0, right: 0,
          background: 'white', borderRadius: '20px 20px 0 0',
          zIndex: 210, transition: 'bottom 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#111111' }}>Menú</span>
            <button onClick={() => setMenuOpen(false)}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex' }}>
              <X size={16} color='#64748b' />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', padding: '12px 16px' }}>
            {menuSheetItems.map(({ to, icon: Icon, label, end }) => {
              const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
              return (
                <NavLink key={to} to={to} end={end}
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px', borderRadius: '12px', background: isActive ? '#FDF8EE' : 'transparent' }}
                  onClick={() => setMenuOpen(false)}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: isActive ? '#C4A96B' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={isActive ? 'white' : '#64748b'} />
                  </div>
                  <span style={{ fontSize: '10px', color: isActive ? '#C4A96B' : '#64748b', fontWeight: isActive ? 700 : 500, textAlign: 'center', lineHeight: '1.2' }}>{label}</span>
                </NavLink>
              )
            })}
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <button onClick={handleLogout}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: '12px', cursor: 'pointer', color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>
              <LogOut size={18} color='#ef4444' />
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Bottom tab bar */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '60px', background: 'white',
          borderTop: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          zIndex: 190, paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        }}>
          {tabItems.map(({ to, icon: Icon, label, end }) => {
            const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
            return (
              <NavLink key={to} to={to} end={end}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', textDecoration: 'none', padding: '6px 0', color: isActive ? '#C4A96B' : '#94a3b8' }}>
                <Icon size={22} color={isActive ? '#C4A96B' : '#94a3b8'} strokeWidth={isActive ? 2.5 : 1.8} />
                <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500 }}>{label}</span>
              </NavLink>
            )
          })}
          <button onClick={() => setMenuOpen(o => !o)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', color: menuOpen ? '#C4A96B' : '#94a3b8' }}>
            <Grid3x3 size={22} color={menuOpen ? '#C4A96B' : '#94a3b8'} strokeWidth={menuOpen ? 2.5 : 1.8} />
            <span style={{ fontSize: '10px', fontWeight: menuOpen ? 700 : 500 }}>Menú</span>
          </button>
        </nav>
      </div>
    )
  }

  /* ─── DESKTOP LAYOUT — TOP NAV ───────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Top navigation bar ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: `${NAV_HEIGHT}px`,
        background: '#111111',
        borderBottom: '1px solid rgba(196,169,107,0.15)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 0,
        zIndex: 100, flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '28px', paddingRight: '24px', borderRight: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {companyLogo
            ? <img src={companyLogo} alt="Logo" style={{ height: '30px', width: '30px', objectFit: 'contain', borderRadius: '5px', background: 'white', padding: '2px' }} />
            : <img src="/ggs-icon.svg" alt="GGS" style={{ height: '28px', width: 'auto' }} />
          }
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>Grupo Global</div>
            <div style={{ color: '#C4A96B', fontSize: '9px', fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase' }}>en Seguros</div>
          </div>
        </div>

        {/* Primary nav items */}
        <nav style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
          {primaryNavItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              title={label}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '6px',
                height: `${NAV_HEIGHT}px`, padding: '0 13px',
                color: isActive ? '#C4A96B' : 'rgba(255,255,255,0.5)',
                borderBottom: isActive ? '2px solid #C4A96B' : '2px solid transparent',
                fontSize: '13px', fontWeight: isActive ? 600 : 400,
                textDecoration: 'none', whiteSpace: 'nowrap',
                transition: 'color 0.15s',
                flexShrink: 0,
              })}>
              <Icon size={15} style={{ flexShrink: 0 }} />
              {label}
            </NavLink>
          ))}

          {/* ── Menú dropdown button ── */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              ref={menuBtnRef}
              onClick={() => setDesktopMenuOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                height: `${NAV_HEIGHT}px`, padding: '0 13px',
                color: isDropdownActive || desktopMenuOpen ? '#C4A96B' : 'rgba(255,255,255,0.5)',
                borderBottom: isDropdownActive || desktopMenuOpen ? '2px solid #C4A96B' : '2px solid transparent',
                fontSize: '13px', fontWeight: isDropdownActive || desktopMenuOpen ? 600 : 400,
                background: 'none', border: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'color 0.15s',
              }}>
              <Grid3x3 size={15} />
              Menú
              <ChevronDown
                size={12}
                style={{
                  transform: desktopMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  marginLeft: '1px',
                }}
              />
            </button>

            {/* Dropdown panel */}
            {desktopMenuOpen && (
              <div
                ref={dropdownRef}
                style={{
                  position: 'absolute',
                  top: `${NAV_HEIGHT + 6}px`,
                  left: 0,
                  background: 'white',
                  borderRadius: '14px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  border: '1px solid #e2e8f0',
                  padding: '10px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '4px',
                  minWidth: '280px',
                  zIndex: 200,
                }}>
                {menuDropdownItems.map(({ to, icon: Icon, label }) => {
                  const isActive = location.pathname.startsWith(to)
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      style={{
                        textDecoration: 'none',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '6px',
                        padding: '12px 8px', borderRadius: '10px',
                        background: isActive ? '#FDF8EE' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: isActive ? '#C4A96B' : '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={20} color={isActive ? 'white' : '#64748b'} />
                      </div>
                      <span style={{
                        fontSize: '11px',
                        color: isActive ? '#C4A96B' : '#64748b',
                        fontWeight: isActive ? 700 : 500,
                        textAlign: 'center', lineHeight: '1.2',
                      }}>{label}</span>
                    </NavLink>
                  )
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right: user + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '16px', paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(196,169,107,0.2)', border: '1px solid rgba(196,169,107,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#C4A96B', flexShrink: 0 }}>
            {session?.user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ color: 'white', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{session?.user?.email?.split('@')[0] || 'Usuario'}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>Administrador</div>
          </div>
          <button onClick={handleLogout} title="Cerrar sesión"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px' }}>
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{
        marginTop: `${NAV_HEIGHT}px`,
        flex: 1,
        padding: '24px',
        minHeight: `calc(100vh - ${NAV_HEIGHT}px)`,
        background: '#F7F5F2',
        boxSizing: 'border-box',
      }}>
        <Outlet />
      </main>
    </div>
  )
}
