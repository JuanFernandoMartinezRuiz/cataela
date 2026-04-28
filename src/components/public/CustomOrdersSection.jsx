import PageHeading from '../common/PageHeading'

const options = [
  'Aromas disponibles: Vainilla, Lavanda, Manzana verde',
  'Colores personalizados',
  'Aromas a eleccion',
  'Diseños especiales',
]

export default function CustomOrdersSection() {
  return (
    <section className="page-section">
      <div className="card-soft grid gap-6 p-6 md:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <PageHeading
          eyebrow="Detalles personalizados"
          title="Creamos pedidos a tu medida"
          description="Desde regalos romanticos hasta detalles para eventos, adaptamos aromas, colores y presentacion para que cada pieza tenga tu sello."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {options.map((option, index) => (
            <div
              key={option}
              className={`p-5 ${
                index % 3 === 0
                  ? 'card-dashed-blue'
                  : index % 3 === 1
                    ? 'card-dashed-green'
                    : 'card-dashed-rose'
              }`}
            >
              <p className="font-display text-2xl text-slate-700">{option}</p>
            </div>
          ))}

          <a
            href="https://wa.me/573053211112"
            target="_blank"
            rel="noreferrer"
            className="btn-primary sm:col-span-2"
          >
            Cotizar personalizado
          </a>
        </div>
      </div>
    </section>
  )
}
