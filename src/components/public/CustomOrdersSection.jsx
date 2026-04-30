import { useEffect, useMemo, useState } from 'react'
import PageHeading from '../common/PageHeading'
import { fetchAvailableEssences } from '../../services/essenceService'

const detailOptions = ['Colores personalizados', 'Aromas a eleccion', 'Diseños especiales']

export default function CustomOrdersSection() {
  const [availableScents, setAvailableScents] = useState([])

  useEffect(() => {
    let isMounted = true

    async function loadScents() {
      try {
        const rows = await fetchAvailableEssences()
        if (isMounted) {
          setAvailableScents(rows)
        }
      } catch {
        if (isMounted) {
          setAvailableScents([])
        }
      }
    }

    loadScents()

    return () => {
      isMounted = false
    }
  }, [])

  const scentNames = useMemo(
    () => availableScents.map((scent) => scent.name).filter(Boolean),
    [availableScents],
  )

  const cards = useMemo(
    () => [
      {
        title: 'Esencias disponibles',
        content: scentNames.length
          ? scentNames.join(', ')
          : 'Proximamente nuevos aromas disponibles.',
      },
      ...detailOptions.map((option) => ({
        title: option,
        content: option,
      })),
    ],
    [scentNames],
  )

  return (
    <section className="page-section">
      <div className="card-soft grid gap-6 p-6 md:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <PageHeading
          eyebrow="Detalles personalizados"
          title="Creamos pedidos a tu medida"
          description="Desde regalos romanticos hasta detalles para eventos, adaptamos aromas, colores y presentacion para que cada pieza tenga tu sello."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card, index) => (
            <div
              key={card.title}
              className={`p-5 ${
                index % 3 === 0
                  ? 'card-dashed-blue'
                  : index % 3 === 1
                    ? 'card-dashed-green'
                    : 'card-dashed-rose'
              }`}
            >
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{card.title}</p>
              <p className="mt-3 font-display text-2xl leading-snug text-slate-700">
                {card.content}
              </p>
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
