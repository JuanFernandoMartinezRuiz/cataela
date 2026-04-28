import { buildWhatsAppRaffleLink, formatCurrency, formatDate } from '../../utils/formatters'
import PageHeading from '../common/PageHeading'
import StatusBadge from '../common/StatusBadge'

export default function ActiveRaffleSection({ raffle }) {
  const numbers = raffle.numbers ?? []

  return (
    <section id="sorteo" className="page-section">
      <div className="card-soft grid gap-6 p-6 md:p-8 lg:grid-cols-[0.85fr_1.15fr]">
        <PageHeading
          eyebrow="Rifa activa"
          title={raffle.title}
          description={raffle.description || 'Participa en la rifa activa de Cataela y reserva tu numero favorito.'}
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="card-dashed p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Premio</p>
            <p className="mt-2 font-display text-3xl text-slate-700">{raffle.prize}</p>
          </div>
          <div className="card-dashed p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Valor por numero</p>
            <p className="mt-2 font-display text-3xl text-slate-700">
              {formatCurrency(raffle.price_per_number)}
            </p>
          </div>
          <div className="card-dashed p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Sorteo</p>
            <p className="mt-2 font-display text-3xl text-slate-700">
              {formatDate(raffle.draw_date)}
            </p>
          </div>
          <div className="card-dashed p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Estado</p>
            <div className="mt-3">
              <StatusBadge tone={raffle.status}>{raffle.status}</StatusBadge>
            </div>
          </div>
          <div className="card-dashed p-5 md:col-span-2">
            <div className="grid gap-4 sm:grid-cols-4">
              <SummaryItem label="Total" value={raffle.summary.total} />
              <SummaryItem label="Disponibles" value={raffle.summary.availableCount} />
              <SummaryItem label="Apartados" value={raffle.summary.reservedCount} />
              <SummaryItem label="Pagados" value={raffle.summary.paidCount} />
            </div>
          </div>
          <div className="card-dashed p-5 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Estados</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <LegendItem label="Disponible" tone="available" />
              <LegendItem label="Apartado" tone="reserved" />
              <LegendItem label="Pagado" tone="paid" />
              <LegendItem label="Ganador" tone="winner" />
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-dashed border-sand bg-gradient-to-br from-white/75 to-mist/10 p-5 md:col-span-2 lg:col-span-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Numeros disponibles de la rifa
          </p>
          <div className="mt-5 grid grid-cols-5 gap-3 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10">
            {numbers.map((number) => (
              <div
                key={number.id}
                className={`flex aspect-square items-center justify-center rounded-2xl border text-sm font-semibold shadow-soft ${stateStyles[number.status]}`}
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
  available: 'bg-white text-slate-700 border-sand/60',
  reserved: 'bg-sun text-slate-700 border-yellow-200',
  paid: 'bg-sage text-slate-700 border-emerald-200',
  winner: 'bg-rose text-slate-700 border-rose-200 ring-2 ring-white/80',
}
