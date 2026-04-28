import { Link } from 'react-router-dom'

export default function HeroSection() {
  return (
    <section className="page-section pt-16 md:pt-24">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="card-soft p-8 md:p-12">
          <span className="inline-flex rounded-full border border-dashed border-mist/55 bg-white/85 px-4 py-2 text-xs uppercase tracking-[0.35em] text-slate-500">
            Popayan, Colombia
          </span>
          <h1 className="mt-6 font-brand text-6xl text-slate-700 md:text-8xl">
            Cataela
          </h1>
          <h2 className="mt-4 font-display text-3xl text-slate-700 md:text-5xl">
            Velas artesanales hechas con amor
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Hechas con amor para iluminar tus momentos.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a
              href="https://wa.me/573053211112"
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              Comprar por WhatsApp
            </a>
            <Link to="/catalogo" className="btn-secondary">
              Ver catalogo
            </Link>
          </div>
        </div>

        <div className="hero-showcase card-soft relative overflow-hidden bg-gradient-to-br from-white via-petal to-mist/18 p-6 md:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card-dashed-rose p-5">
              <p className="font-display text-3xl text-slate-700">Ramos</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Piezas delicadas para regalar, decorar y celebrar.
              </p>
            </div>
            <div className="card-dashed-blue bg-mist/12 p-5">
              <p className="font-display text-3xl text-slate-700">Aromas</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Vainilla, lavanda, frutos rojos, fresa, Maracuya, Manzana verde en composiciones suaves.
              </p>
            </div>
            <div className="card-dashed-green p-6 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Catalogo administrable
              </p>
              <p className="mt-3 font-display text-3xl text-slate-700">
                Una web lista para crecer con productos, imagenes y rifas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
