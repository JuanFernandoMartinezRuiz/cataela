import { useEffect, useState } from 'react'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import StatusBadge from '../../components/common/StatusBadge'
import {
  createRaffleWithNumbers,
  fetchRaffleNumbers,
  fetchRaffles,
  getRaffleSummary,
  raffleNumberStatuses,
  raffleStatuses,
  updateRaffle,
  updateRaffleNumber,
} from '../../services/raffleService'
import { formatCurrency, formatDate } from '../../utils/formatters'

const emptyRaffleForm = {
  title: '',
  prize: '',
  description: '',
  price_per_number: '',
  status: 'draft',
  draw_date: '',
}

const statusDescriptions = {
  draft: 'No se muestra al publico.',
  active: 'Se muestra en la pagina publica y oculta cualquier otra rifa activa.',
  closed: 'Se oculta del publico y queda archivada.',
}

export default function AdminRafflesPage() {
  const [raffles, setRaffles] = useState([])
  const [selectedRaffleId, setSelectedRaffleId] = useState('')
  const [selectedRaffle, setSelectedRaffle] = useState(null)
  const [numbers, setNumbers] = useState([])
  const [raffleForm, setRaffleForm] = useState(emptyRaffleForm)
  const [numberForm, setNumberForm] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadRaffles()
  }, [])

  useEffect(() => {
    if (selectedRaffleId) {
      loadNumbers(selectedRaffleId)
    }
  }, [selectedRaffleId])

  async function loadRaffles() {
    try {
      setLoading(true)
      const raffleRows = await fetchRaffles()
      setRaffles(raffleRows)

      if (raffleRows.length && !selectedRaffleId) {
        setSelectedRaffleId(raffleRows[0].id)
        setSelectedRaffle(raffleRows[0])
      } else if (selectedRaffleId) {
        const refreshedSelection =
          raffleRows.find((raffle) => raffle.id === selectedRaffleId) || null
        setSelectedRaffle(refreshedSelection)
      }
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar las rifas.')
    } finally {
      setLoading(false)
    }
  }

  async function loadNumbers(raffleId) {
    try {
      const raffleRow = raffles.find((raffle) => raffle.id === raffleId)
      setSelectedRaffle(raffleRow || null)
      const numberRows = await fetchRaffleNumbers(raffleId)
      setNumbers(numberRows)
      setNumberForm(null)
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar los numeros.')
    }
  }

  async function handleCreateRaffle(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const createdRaffle = await createRaffleWithNumbers({
        ...raffleForm,
        price_per_number: Number(raffleForm.price_per_number || 0),
      })

      setRaffleForm(emptyRaffleForm)
      await loadRaffles()
      setSelectedRaffleId(createdRaffle.id)
    } catch (saveError) {
      setError(saveError.message || 'No fue posible crear la rifa.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateRaffleMeta(field, value) {
    if (!selectedRaffle) {
      return
    }

    const nextRaffle = { ...selectedRaffle, [field]: value }
    setSelectedRaffle(nextRaffle)

    try {
      await updateRaffle(selectedRaffle.id, { [field]: value })
      await loadRaffles()
      setSelectedRaffleId(selectedRaffle.id)
    } catch (updateError) {
      setError(updateError.message || 'No fue posible actualizar la rifa.')
    }
  }

  async function handleSaveNumber(event) {
    event.preventDefault()
    if (!numberForm) {
      return
    }

    try {
      const updatedNumber = await updateRaffleNumber(numberForm.id, {
        status: numberForm.status,
        buyer_name: numberForm.buyer_name || null,
        buyer_phone: numberForm.buyer_phone || null,
      })

      setNumbers((current) =>
        current.map((item) => (item.id === updatedNumber.id ? updatedNumber : item)),
      )

      if (numberForm.status === 'winner') {
        await updateRaffle(selectedRaffle.id, { winner_number: numberForm.number })
      }
    } catch (saveError) {
      setError(saveError.message || 'No fue posible guardar el numero.')
    }
  }

  const visibleNumbers =
    filter === 'all' ? numbers : numbers.filter((number) => number.status === filter)
  const summary = getRaffleSummary(selectedRaffle, numbers)

  return (
    <>
      <div className="admin-panel p-6 md:p-8">
        <PageHeading
          eyebrow="Rifas"
          title="Gestiona rifas y numeros"
          description="Crea rifas, genera los numeros 00 al 99 y actualiza comprador, telefono y estado desde el panel."
        />
      </div>

      {loading ? <LoadingState label="Cargando rifas..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <form onSubmit={handleCreateRaffle} className="admin-panel p-6">
              <h2 className="font-display text-3xl text-slate-700">Crear nueva rifa</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Titulo">
                  <input
                    className="field-input"
                    value={raffleForm.title}
                    onChange={(event) =>
                      setRaffleForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Premio">
                  <input
                    className="field-input"
                    value={raffleForm.prize}
                    onChange={(event) =>
                      setRaffleForm((current) => ({ ...current, prize: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Precio por numero">
                  <input
                    type="number"
                    min="0"
                    className="field-input"
                    value={raffleForm.price_per_number}
                    onChange={(event) =>
                      setRaffleForm((current) => ({
                        ...current,
                        price_per_number: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Fecha sorteo">
                  <input
                    type="date"
                    className="field-input"
                    value={raffleForm.draw_date}
                    onChange={(event) =>
                      setRaffleForm((current) => ({ ...current, draw_date: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Estado">
                  <select
                    className="field-input"
                    value={raffleForm.status}
                    onChange={(event) =>
                      setRaffleForm((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    {raffleStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Descripcion" className="md:col-span-2">
                  <textarea
                    rows="4"
                    className="field-input"
                    value={raffleForm.description}
                    onChange={(event) =>
                      setRaffleForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              <button type="submit" disabled={saving} className="btn-primary mt-6">
                {saving ? 'Creando...' : 'Crear rifa y generar numeros'}
              </button>
              <p className="mt-3 text-sm text-slate-500">
                Si la creas como <strong>active</strong>, cualquier otra rifa activa pasara a
                <strong> closed</strong> automaticamente.
              </p>
            </form>

            <div className="admin-panel p-6">
              <h2 className="font-display text-3xl text-slate-700">Rifas creadas</h2>
              <div className="mt-5 space-y-3">
                {raffles.map((raffle) => (
                  <button
                    key={raffle.id}
                    type="button"
                    onClick={() => setSelectedRaffleId(raffle.id)}
                    className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                      selectedRaffleId === raffle.id
                        ? 'border-mist bg-mist/10'
                        : 'border-sand/50 bg-white/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-700">{raffle.title}</p>
                        <p className="text-sm text-slate-500">{formatDate(raffle.draw_date)}</p>
                      </div>
                      <StatusBadge tone={raffle.status}>{raffle.status}</StatusBadge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {selectedRaffle ? (
              <>
                <div className="admin-panel p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Rifa seleccionada
                      </p>
                      <h2 className="mt-2 font-display text-4xl text-slate-700">
                        {selectedRaffle.title}
                      </h2>
                    </div>
                    <StatusBadge tone={selectedRaffle.status}>
                      {selectedRaffle.status}
                    </StatusBadge>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field label="Estado">
                      <select
                        className="field-input"
                        value={selectedRaffle.status}
                        onChange={(event) =>
                          handleUpdateRaffleMeta('status', event.target.value)
                        }
                      >
                        {raffleStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-slate-500">
                        {statusDescriptions[selectedRaffle.status]}
                      </p>
                    </Field>
                    <Field label="Numero ganador">
                      <input
                        className="field-input"
                        value={selectedRaffle.winner_number || ''}
                        onChange={(event) =>
                          handleUpdateRaffleMeta('winner_number', event.target.value)
                        }
                        placeholder="Ej. 17"
                      />
                    </Field>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard label="Total" value={summary.total} />
                    <SummaryCard label="Pagados" value={summary.paidCount} />
                    <SummaryCard label="Disponibles" value={summary.availableCount} />
                    <SummaryCard
                      label="Ingreso pagado"
                      value={formatCurrency(summary.paidRevenue)}
                    />
                  </div>
                </div>

                <div className="admin-panel p-6">
                  <div className="flex flex-wrap gap-2">
                    {['all', ...raffleNumberStatuses].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFilter(status)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          filter === status
                            ? 'bg-slate-700 text-white'
                            : 'border border-dashed border-sand bg-white/80 text-slate-600'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 grid grid-cols-5 gap-3 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10">
                    {visibleNumbers.map((number) => (
                      <button
                        key={number.id}
                        type="button"
                        onClick={() => setNumberForm(number)}
                        className={`aspect-square rounded-2xl border text-sm font-semibold shadow-soft transition hover:-translate-y-0.5 ${
                          stateStyles[number.status]
                        }`}
                      >
                        {number.number}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-panel p-6">
                  <h3 className="font-display text-3xl text-slate-700">Editar numero</h3>
                  {numberForm ? (
                    <form onSubmit={handleSaveNumber} className="mt-5 grid gap-4 md:grid-cols-2">
                      <Field label="Numero">
                        <input value={numberForm.number} readOnly className="field-input" />
                      </Field>
                      <Field label="Estado">
                        <select
                          value={numberForm.status}
                          onChange={(event) =>
                            setNumberForm((current) => ({
                              ...current,
                              status: event.target.value,
                            }))
                          }
                          className="field-input"
                        >
                          {raffleNumberStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Comprador">
                        <input
                          value={numberForm.buyer_name || ''}
                          onChange={(event) =>
                            setNumberForm((current) => ({
                              ...current,
                              buyer_name: event.target.value,
                            }))
                          }
                          className="field-input"
                        />
                      </Field>
                      <Field label="Telefono">
                        <input
                          value={numberForm.buyer_phone || ''}
                          onChange={(event) =>
                            setNumberForm((current) => ({
                              ...current,
                              buyer_phone: event.target.value,
                            }))
                          }
                          className="field-input"
                        />
                      </Field>
                      <button type="submit" className="btn-primary md:col-span-2">
                        Guardar numero
                      </button>
                    </form>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      Selecciona un numero para editar su estado y datos del comprador.
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-[1.4rem] border border-white/70 bg-white/85 p-4 shadow-soft">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl text-slate-700">{value}</p>
    </div>
  )
}

const stateStyles = {
  available: 'bg-white text-slate-700 border-sand/60',
  reserved: 'bg-sun text-slate-700 border-yellow-200',
  paid: 'bg-sage text-slate-700 border-emerald-200',
  winner: 'bg-rose text-slate-700 border-rose-200 ring-2 ring-white/80',
}
