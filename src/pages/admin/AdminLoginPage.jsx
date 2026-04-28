import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import ErrorState from '../../components/common/ErrorState'
import { useAuth } from '../../providers/AuthProvider'
import { signInAdmin } from '../../services/authService'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!loading && isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await signInAdmin({ email, password })
      navigate(location.state?.from || '/admin', { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'No fue posible iniciar sesion.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-5">
      <div className="page-floral pointer-events-none" />
      <div className="card-soft relative w-full max-w-lg p-8">
        <p className="font-brand text-5xl text-slate-700">Cataela</p>
        <h1 className="mt-4 font-display text-4xl text-slate-700">Acceso admin</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Inicia sesion con tu usuario de Supabase Auth para gestionar el catalogo.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="field-label">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field-input"
              placeholder="admin@cataela.com"
            />
          </div>

          <div>
            <label className="field-label">Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-input"
              placeholder="Tu contrasena"
            />
          </div>

          {error ? <ErrorState message={error} /> : null}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Ingresando...' : 'Entrar al panel'}
          </button>
        </form>
      </div>
    </div>
  )
}
