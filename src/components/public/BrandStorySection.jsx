import PageHeading from '../common/PageHeading'

const values = [
  {
    title: 'Perfectas para regalar',
    description:
      'Detalles delicados que envuelven momentos especiales con aroma, calidez y un toque inolvidable.',
    tone: 'rose',
    Icon: GiftBloomIcon,
  },
  {
    title: 'Ideales para decorar',
    description:
      'Piezas pensadas para llenar tus espacios de belleza suave, armonia visual y presencia artesanal.',
    tone: 'blue',
    Icon: HomeSparkIcon,
  },
  {
    title: 'Disenos unicos y personalizados',
    description:
      'Creamos propuestas con esencia propia para que cada vela se sienta cercana, especial y hecha para ti.',
    tone: 'green',
    Icon: HeartWandIcon,
  },
]

const toneClasses = {
  rose: {
    card: 'border-roseDeep/75 bg-gradient-to-br from-white via-rose/10 to-white',
    iconWrap: 'bg-rose/18 text-roseDeep',
    line: 'bg-roseDeep/45',
  },
  blue: {
    card: 'border-mist/60 bg-gradient-to-br from-white via-mist/10 to-white',
    iconWrap: 'bg-mist/18 text-mistDeep',
    line: 'bg-mist/55',
  },
  green: {
    card: 'border-sageDeep/80 bg-gradient-to-br from-white via-sage/12 to-white',
    iconWrap: 'bg-sage/28 text-slate-600',
    line: 'bg-sageDeep/75',
  },
}

export default function BrandStorySection() {
  return (
    <section className="page-section">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <PageHeading
          eyebrow="Sobre la marca"
          title="Detalles artesanales con aroma y calidez"
          description="En Cataela creamos velas artesanales unicas, pensadas para acompanar momentos especiales. Cada pieza esta hecha a mano con dedicacion, combinando diseno, aroma y calidez."
        />

        <div className="grid gap-4 md:grid-cols-3">
          {values.map(({ title, description, tone, Icon }) => {
            const styles = toneClasses[tone]

            return (
              <article
                key={title}
                className={`rounded-[1.8rem] border border-dashed p-7 shadow-soft transition duration-300 ease-out hover:scale-[1.02] hover:shadow-card ${styles.card}`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${styles.iconWrap}`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="mt-5 font-display text-[1.9rem] leading-tight text-slate-700">
                  {title}
                </h3>
                <div className={`mt-3 h-[2px] w-14 rounded-full ${styles.line}`} />
                <p className="mt-4 text-sm leading-7 text-slate-500">{description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function GiftBloomIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M12 9v11" strokeLinecap="round" />
      <path d="M5 9h14v4H5z" />
      <path d="M6.5 13v6h11v-6" />
      <path
        d="M12 9c-1.8 0-4-1-4-3.2C8 4.4 9 3.5 10.2 3.5 11.4 3.5 12 4.7 12 6v3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 9c1.8 0 4-1 4-3.2 0-1.4-1-2.3-2.2-2.3-1.2 0-1.8 1.2-1.8 2.5v3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18.5 6.5c.8.1 1.7.7 1.7 1.8 0 1.2-1 1.9-2.1 1.9-.9 0-1.6-.5-2-.9" strokeLinecap="round" />
    </svg>
  )
}

function HomeSparkIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="m4 11 8-6 8 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10.5V19h12v-8.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 19v-4.5h4V19" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m18.3 4.4.4 1.2 1.2.4-1.2.4-.4 1.2-.4-1.2-1.2-.4 1.2-.4.4-1.2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HeartWandIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="m5 19 9-9" strokeLinecap="round" />
      <path d="m13.5 4 .5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m17.2 8.2.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4.4-1.1Z" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M8.1 11.8c1.1-1.2 3-1.2 4.1 0l.3.3.3-.3c1.1-1.2 3-1.2 4.1 0 1.1 1.1 1.1 3 0 4.1l-4.4 4.1-4.4-4.1c-1.1-1.1-1.1-3 0-4.1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
