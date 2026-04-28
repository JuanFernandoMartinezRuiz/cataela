import PageHeading from '../common/PageHeading'

const values = [
  'Perfectas para regalar',
  'Ideales para decorar',
  'Disenos unicos y personalizados',
]

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
          {values.map((value) => (
            <article key={value} className="card-dashed p-6">
              <div className="h-12 w-12 rounded-full bg-blush/70" />
              <h3 className="mt-4 font-display text-2xl text-slate-700">{value}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Pensadas para sentirse cercanas, delicadas y memorables.
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
