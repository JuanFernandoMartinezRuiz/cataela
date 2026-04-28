import { NavLink } from 'react-router-dom'

export default function PublicNavbar({ activeRaffle }) {
  const links = [
    { to: '/', label: 'Inicio', end: true },
    { to: '/catalogo', label: 'Catalogo' },
    ...(activeRaffle ? [{ href: '/#sorteo', label: 'Sorteo' }] : []),
    { to: '/admin/login', label: 'Admin' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-paper/85 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-mist/70 bg-white/80 shadow-soft">
            <span className="font-brand text-3xl text-mist">C</span>
          </div>
          <div>
            <p className="font-brand text-3xl leading-none text-slate-700">Cataela</p>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Velas artesanales
            </p>
          </div>
        </NavLink>

        <div className="hidden items-center gap-3 rounded-full border border-white/60 bg-white/60 px-4 py-2 shadow-soft md:flex">
          {links.map((link) => (
            link.href ? (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
              >
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-mist text-white' : 'text-slate-600 hover:bg-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            )
          ))}
        </div>

        <a
          href="https://wa.me/573053211112"
          target="_blank"
          rel="noreferrer"
          className="btn-primary"
        >
          WhatsApp
        </a>
      </nav>

      <div className="border-t border-white/50 bg-white/50 px-5 py-3 md:hidden">
        <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto pb-1">
          {links.map((link) => (
            link.href ? (
              <a
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-full border border-dashed border-sand bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 transition"
              >
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-mist text-white'
                      : 'border border-dashed border-sand bg-white/80 text-slate-600'
                  }`
                }
              >
                {link.label}
              </NavLink>
            )
          ))}
        </div>
      </div>
    </header>
  )
}
