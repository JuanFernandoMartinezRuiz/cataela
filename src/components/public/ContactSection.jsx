import PageHeading from '../common/PageHeading'

const links = [
  {
    label: 'Instagram',
    value: '@velasartesanalescataela',
    href: 'https://www.instagram.com/velasartesanalescataela/',
  },
  {
    label: 'WhatsApp',
    value: '+57 305 321 1112',
    href: 'https://wa.me/573053211112',
  },
  {
    label: 'Facebook',
    value: 'Comunidad Cataela',
    href: 'https://www.facebook.com/groups/386746115095966/user/61562993172447/?locale=es_LA',
  },
  {
    label: 'Ubicacion',
    value: 'Popayan, Colombia',
    href: 'https://wa.me/573053211112',
  },
]

export default function ContactSection() {
  return (
    <section className="page-section">
      <div className="card-soft p-6 md:p-8">
        <PageHeading
          eyebrow="Contacto"
          title="Conversemos sobre tu proximo detalle"
          description="Escribenos para consultar disponibilidad, personalizaciones o reservar un numero para la rifa activa."
          center
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {links.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="card-dashed p-5 transition hover:-translate-y-1 hover:bg-white"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-3 font-display text-2xl text-slate-700">{item.value}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
