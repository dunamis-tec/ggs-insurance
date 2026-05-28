import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'

// Layout
import MainLayout from './components/layout/MainLayout'

// Pages
import Login from './pages/auth/Login'
import ResetPassword from './pages/auth/ResetPassword'
import Dashboard from './pages/dashboard/Dashboard'
import Clientes from './pages/clientes/Clientes'
import Polizas from './pages/polizas/Polizas'
import Aseguradoras from './pages/aseguradoras/Aseguradoras'
import Requerimientos from './pages/requerimientos/Requerimientos'
import Liquidaciones from './pages/liquidaciones/Liquidaciones'
import Comisiones from './pages/comisiones/Comisiones'
import Tareas from './pages/tareas/Tareas'
import Vehiculos from './pages/vehiculos/Vehiculos'
import Configuracion from './pages/configuracion/Configuracion'
import Onboarding from './pages/onboarding/Onboarding'
import InstallBanner from './components/InstallBanner'

function ProtectedRoute({ children, session }) {
  if (!session) return <Navigate to="/login" replace />
  return children
}

// Read the URL hash at module load time — before Supabase's client can consume it.
// This is the only reliable way to detect an invite flow, because by the time React
// renders and effects run, the hash has already been processed and cleared.
const _initialHashParams = (() => {
  try {
    return new URLSearchParams(window.location.hash.substring(1))
  } catch {
    return new URLSearchParams()
  }
})()
// Use `let` so we can consume the flag after the first redirect.
// If it stayed `const true`, every subsequent SIGNED_IN event (e.g. normal
// re-login after the invited user sets their password) would also redirect
// to /reset-password.
let _isInviteFlow = _initialHashParams.get('type') === 'invite'

export default function App() {
  const [session, setSession]           = useState(undefined)
  const [userRow, setUserRow]           = useState(undefined) // null = not found, obj = found
  const [checkingUser, setCheckingUser] = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()

  const fetchUserRow = useCallback(async (uid) => {
    setCheckingUser(true)
    let { data } = await supabase.from('users').select('id, empresa_id, rol, role, nombre, email').eq('id', uid).maybeSingle()

    // Invited users: admin pre-creates their row by email but without the auth id.
    // On first login, find that row by email and update the id so it matches auth.uid().
    if (!data) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: byEmail } = await supabase
          .from('users').select('id, empresa_id, rol, role, nombre, email')
          .eq('email', user.email).maybeSingle()
        if (byEmail && byEmail.id !== uid) {
          // Migrate the row: insert with correct id, delete old one
          const { data: migrated } = await supabase
            .from('users')
            .upsert({ ...byEmail, id: uid }, { onConflict: 'id' })
            .select('id, empresa_id, rol, role, nombre, email').maybeSingle()
          // Remove stale row with wrong id (best-effort)
          await supabase.from('users').delete().eq('id', byEmail.id).neq('id', uid)
          data = migrated ?? byEmail
        }
      }
    }

    setUserRow(data ?? null)
    setCheckingUser(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        // Always fetch userRow so loading resolves
        fetchUserRow(session.user.id)
        // Invite flow: navigate to reset-password, then consume the flag so
        // that any later SIGNED_IN event (e.g. normal re-login) is unaffected.
        if (_isInviteFlow) {
          _isInviteFlow = false
          navigate('/reset-password')
        }
      } else {
        setUserRow(undefined)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_OUT') {
        setUserRow(undefined)
      } else if (event === 'PASSWORD_RECOVERY') {
        // Recovery link clicked: ensure user lands on the reset-password form
        navigate('/reset-password')
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Always fetch the user row so the loading screen can resolve.
        fetchUserRow(session.user.id)
        // Invite flow: redirect to reset-password so the user sets their password.
        // Consume the flag immediately so subsequent SIGNED_IN events (e.g. normal
        // re-login after the invited user has already set their password) are not
        // redirected to /reset-password.
        if (_isInviteFlow) {
          _isInviteFlow = false
          navigate('/reset-password')
        }
      }
      // TOKEN_REFRESHED, USER_UPDATED, etc: only update session token,
      // do NOT re-fetch userRow or set checkingUser — avoids wiping component state
    })
    return () => subscription.unsubscribe()
  }, [fetchUserRow])

  // Loading: only block on initial load — when session or userRow are not yet known.
  // Do NOT block when checkingUser=true but userRow is already populated; that would
  // unmount all child components and wipe in-progress work on every token refresh.
  // Exception: /reset-password must always render (it handles its own auth state).
  const isResetRoute = location.pathname === '/reset-password'
  if (!isResetRoute && (session === undefined || (session && userRow === undefined))) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p>Cargando...</p>
    </div>
  )

  // Authenticated but no empresa → onboarding (skip for /reset-password)
  if (!isResetRoute && session && (userRow === null || !userRow?.empresa_id)) {
    return <Onboarding session={session} onComplete={() => fetchUserRow(session.user.id)} />
  }

  return (
    <>
    <InstallBanner />
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={
        <ProtectedRoute session={session}>
          <MainLayout session={session} />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="clientes/*" element={<Clientes />} />
        <Route path="polizas/*" element={<Polizas />} />
        <Route path="aseguradoras/*" element={<Aseguradoras />} />
        <Route path="requerimientos/*" element={<Requerimientos />} />
        <Route path="liquidaciones/*" element={<Liquidaciones />} />
        <Route path="comisiones/*" element={<Comisiones />} />
        <Route path="tareas/*" element={<Tareas />} />
        <Route path="vehiculos/*" element={<Vehiculos />} />
        <Route path="configuracion/*" element={<Configuracion />} />
      </Route>
    </Routes>
    </>
  )
}