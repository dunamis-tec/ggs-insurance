import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// Layout
import MainLayout from './components/layout/MainLayout'

// Pages
import Login from './pages/auth/Login'
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

function ProtectedRoute({ children, session }) {
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p>Cargando...</p>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
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