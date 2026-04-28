import { NavLink, Outlet } from 'react-router-dom'
import { signOutAdmin } from '../services/authService'
import { useAuth } from '../providers/AuthProvider'

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/productos', label: 'Productos' },
  { to: '/admin/rifas', label: 'Rifas' },
]

export default function AdminLayout() {
  const { user } = useAuth()

  async function handleSignOut() {
    await signOutAdmin()
  }

  return (
    <div className="app-shell">
      <div className="page-floral pointer-events-none" />
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-5 py-6 md:px-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="admin-panel h-fit p-6">
          <p className="font-brand text-4xl text-slate-700">Cataela</p>
          <p className="mt-2 text-sm text-slate-500">Panel administrativo</p>

          <nav className="mt-8 space-y-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-mist text-white'
                      : 'bg-white/75 text-slate-600 hover:bg-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-[1.5rem] border border-dashed border-sand bg-petal/80 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Sesion activa
            </p>
            <p className="mt-2 break-all text-sm text-slate-700">{user?.email}</p>
          </div>

          <button type="button" onClick={handleSignOut} className="btn-secondary mt-6 w-full">
            Cerrar sesion
          </button>
        </aside>

        <section className="space-y-6">
          <Outlet />
        </section>
      </div>
    </div>
  )
}
