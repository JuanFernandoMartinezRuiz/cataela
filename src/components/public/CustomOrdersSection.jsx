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

  const scentDescriptions = useMemo(
    () =>
      availableScents
        .map((scent) => String(scent.description || '').trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(' · '),
    [availableScents],
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
          <div className="card-dashed-blue p-5 sm:col-span-2">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              Aromas disponibles
            </p>

            {scentNames.length ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {scentNames.map((scent) => (
                    <span
                      key={scent}
                      className="rounded-full border border-dashed border-mistDeep/35 bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-600"
                    >
                      {scent}
                    </span>
                  ))}
                </div>

                {scentDescriptions ? (
                  <p className="mt-4 text-sm leading-6 text-slate-500">{scentDescriptions}</p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 font-display text-2xl leading-snug text-slate-700">
                Proximamente nuevos aromas disponibles.
              </p>
            )}
          </div>

          {detailOptions.map((option, index) => (
            <div
              key={option}
              className={`p-5 ${
                index % 2 === 0 ? 'card-dashed-green' : 'card-dashed-rose'
              }`}
            >
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{option}</p>
              <p className="mt-3 font-display text-2xl leading-snug text-slate-700">
                {option}
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
