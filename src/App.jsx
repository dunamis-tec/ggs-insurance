import { Routes, Route, Navigate } from 'react-router-dom'
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

function ProtectedRoute({ children, session }) {
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [session, setSession]           = useState(undefined)
  const [userRow, setUserRow]           = useState(undefined) // null = not found, obj = found
  const [checkingUser, setCheckingUser] = useState(false)

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
      if (session?.user) fetchUserRow(session.user.id)
      else { setUserRow(undefined) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_OUT') {
        setUserRow(undefined)
      } else if (event === 'SIGNED_IN' && session?.user) {
        fetchUserRow(session.user.id)
      }
      // TOKEN_REFRESHED, USER_UPDATED, etc: only update session token,
      // do NOT re-fetch userRow or set checkingUser — avoids wiping component state
    })
    return () => subscription.unsubscribe()
  }, [fetchUserRow])

  // Loading: only block on initial load — when session or userRow are not yet known.
  // Do NOT block when checkingUser=true but userRow is already populated; that would
  // unmount all child components and wipe in-progress work on every token refresh.
  if (session === undefined || (session && userRow === undefined)) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p>Cargando...</p>
    </div>
  )

  // Authenticated but no empresa → onboarding
  if (session && (userRow === null || !userRow?.empresa_id)) {
    return <Onboarding session={session} onComplete={() => fetchUserRow(session.user.id)} />
  }

  return (
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
  )
}