import { buildWhatsAppRaffleLink, formatCurrency, formatDate } from '../../utils/formatters'
import ImagePlaceholder from '../common/ImagePlaceholder'
import PageHeading from '../common/PageHeading'
import StatusBadge from '../common/StatusBadge'

export default function ActiveRaffleSection({ raffle }) {
  const numbers = (raffle.numbers ?? []).filter((number) => number.status === 'available')
  const gallery = raffle.gallery ?? []
  const winner = raffle.winner
  const hasImages = Boolean(raffle.main_image_url || gallery.length)

  return (
    <section id="sorteo" className="page-section">
      <div className="card-soft grid gap-5 p-6 md:p-8 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-4">
          <PageHeading
            eyebrow="Rifa activa"
            title={raffle.title}
            description={
              raffle.description ||
              'Participa en la rifa activa de Cataela y reserva tu numero favorito.'
            }
            actions={
              <a
                href={buildWhatsAppRaffleLink(raffle.title)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                Pedir numero por WhatsApp
              </a>
            }
          />

          {raffle.summary?.isComplete ? (
            <div className="inline-flex rounded-full border border-dashed border-sageDeep/80 bg-sage/45 px-4 py-2 text-sm font-semibold text-slate-700">
              Rifa completa
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card-dashed-rose p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Premio</p>
              <p className="mt-2 font-display text-3xl text-slate-700">{raffle.prize}</p>
            </div>
            <div className="card-dashed-green p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Valor por numero</p>
              <p className="mt-2 font-display text-3xl text-slate-700">
                {formatCurrency(raffle.price_per_number)}
              </p>
            </div>
            <div className="card-dashed-blue p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Sorteo</p>
              <p className="mt-2 font-display text-3xl text-slate-700">
                {formatDate(raffle.draw_date)}
              </p>
            </div>
            <div className="card-dashed-green p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Estado</p>
              <div className="mt-3">
                <StatusBadge tone={raffle.status}>{raffle.status}</StatusBadge>
              </div>
            </div>
            <div className="card-dashed-blue p-5 md:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <SummaryItem label="Total" value={raffle.summary.total} />
                <SummaryItem label="Disponibles" value={raffle.summary.availableCount} />
                {winner ? <SummaryItem label="Ganador" value={winner.number} /> : null}
              </div>
            </div>
            <div className="card-dashed-rose p-5 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Estados</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <LegendItem label="Disponible" tone="available" />
                <LegendItem label="Apartado" tone="reserved" />
                <LegendItem label="Pagado" tone="paid" />
                <LegendItem label="Ganador" tone="winner" />
              </div>
            </div>
            {winner ? (
              <div className="rounded-[1.75rem] border border-dashed border-roseDeep/80 bg-gradient-to-br from-rose/28 via-white to-sun/26 p-5 shadow-soft md:col-span-2">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Resultado del sorteo
                </p>
                <div className="mt-3 space-y-2">
                  {winner.buyer_name ? (
                    <p className="font-display text-3xl text-slate-700">
                      Felicitaciones, {winner.buyer_name}
                    </p>
                  ) : null}
                  <p className="text-base font-semibold text-slate-600">
                    Numero ganador: {winner.number}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 lg:pt-1">
          {hasImages ? (
            <div className="card-dashed-blue p-5">
              {raffle.main_image_url ? (
                <img
                  src={raffle.main_image_url}
                  alt={raffle.prize}
                  className="h-72 w-full rounded-[1.5rem] object-cover"
                />
              ) : (
                <ImagePlaceholder label={raffle.prize} className="h-72 w-full" />
              )}

              {gallery.length ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {gallery.map((image) => (
                    <img
                      key={image.id}
                      src={image.image_url}
                      alt={`Detalle de ${raffle.title}`}
                      className="h-28 w-full rounded-[1.25rem] object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="card-dashed-green bg-gradient-to-br from-white/80 to-sage/18 p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Numeros disponibles de la rifa
          </p>
          <div className="mt-5 grid grid-cols-5 gap-1.5 sm:grid-cols-8 md:grid-cols-10 xl:grid-cols-12">
            {numbers.map((number) => (
              <div
                key={number.id}
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-semibold shadow-soft ${stateStyles[number.status]}`}
              >
                {number.number}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl text-slate-700">{value}</p>
    </div>
  )
}

function LegendItem({ label, tone }) {
  return (
    <div className="flex items-center gap-3">
      <StatusBadge tone={tone}>{label}</StatusBadge>
    </div>
  )
}

const stateStyles = {
  available: 'bg-mist/16 text-slate-700 border-mist/55',
  reserved: 'bg-sun/78 text-slate-700 border-sunDeep/80',
  paid: 'bg-sage text-slate-700 border-sageDeep/80',
  winner: 'bg-rose/62 text-slate-700 border-roseDeep/80 ring-2 ring-white/80',
}
