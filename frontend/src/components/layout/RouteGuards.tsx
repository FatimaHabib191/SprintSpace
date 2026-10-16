import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/ui/misc'
import { useAuth } from '@/context/AuthContext'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader label="Restoring your session…" />
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

export function GuestOnly() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/app" replace />
  return <Outlet />
}
