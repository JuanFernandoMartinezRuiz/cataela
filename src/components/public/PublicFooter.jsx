import { Link } from 'react-router-dom'
import { useAuth } from '../../providers/AuthProvider'

export default function PublicFooter() {
  const { isAuthenticated } = useAuth()

  return (
    <footer className="px-5 pb-8 pt-4 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/70 px-6 py-6 shadow-soft md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-brand text-3xl text-slate-700">Cataela</p>
          <p className="text-sm text-slate-500">
            Hechas con amor para iluminar tus momentos.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          <p>Instagram: @velasartesanalescataela</p>
          <p>Popayan, Colombia</p>
          {isAuthenticated ? (
            <p className="mt-2">
              <Link to="/admin" className="text-xs uppercase tracking-[0.25em] text-slate-400 hover:text-slate-600">
                Panel
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
