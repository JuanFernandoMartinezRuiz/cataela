import { Navigate, useLocation } from 'react-router-dom'
import LoadingState from '../common/LoadingState'
import { useAuth } from '../../providers/AuthProvider'

export default function ProtectedRoute({ children }) {
  const { loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState label="Validando sesion..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return children
}
