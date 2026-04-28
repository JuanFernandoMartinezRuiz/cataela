import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import StatusBadge from '../../components/common/StatusBadge'
import FinanceChart from '../../components/admin/FinanceChart'
import FinanceForm from '../../components/admin/FinanceForm'
import {
  createFinanceCategory,
  createFinanceTransaction,
  deleteFinanceTransaction,
  fetchFinanceCategories,
  fetchFinanceTransactions,
  updateFinanceTransaction,
} from '../../services/financeService'
import { formatCurrency, formatDate } from '../../utils/formatters'

const filterOptions = [
  { value: 'week', label: 'Semana actual' },
  { value: 'month', label: 'Mes actual' },
  { value: 'year', label: 'Año actual' },
  { value: 'custom', label: 'Rango personalizado' },
]

export default function AdminFinancePage() {
  const [financeCategories, setFinanceCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [rangeType, setRangeType] = useState('month')
  const [customRange, setCustomRange] = useState({
    startDate: '',
    endDate: '',
  })
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')

  const activeRange = useMemo(
    () => buildDateRange(rangeType, customRange),
    [rangeType, customRange],
  )

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadTransactions(activeRange)
  }, [activeRange.startDate, activeRange.endDate])

  async function loadCategories() {
    try {
      const rows = await fetchFinanceCategories()
      setFinanceCategories(rows)
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar las categorias financieras.')
    }
  }

  async function loadTransactions(range) {
    try {
      setLoading(true)
      setError('')
      const rows = await fetchFinanceTransactions(range)
      setTransactions(rows)
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar los movimientos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    setSaving(true)
    setSaveLabel('Guardando movimiento...')
    setError('')

    try {
      if (selectedTransaction) {
        const updated = await updateFinanceTransaction(selectedTransaction.id, payload)
        setTransactions((current) =>
          sortTransactions(
            current.map((transaction) =>
              transaction.id === selectedTransaction.id ? updated : transaction,
            ),
          ),
        )
        setSelectedTransaction(null)
        return
      }

      const created = await createFinanceTransaction(payload)
      setTransactions((current) => sortTransactions([created, ...current]))
    } catch (submitError) {
      setError(submitError.message || 'No fue posible guardar el movimiento.')
      throw submitError
    } finally {
      setSaving(false)
      setSaveLabel('')
    }
  }

  async function handleDeleteTransaction(transaction) {
    const confirmed = window.confirm(`Eliminar el movimiento "${transaction.description}"?`)
    if (!confirmed) {
      return
    }

    try {
      setDeletingId(transaction.id)
      setError('')
      await deleteFinanceTransaction(transaction.id)
      setTransactions((current) =>
        current.filter((item) => item.id !== transaction.id),
      )

      if (selectedTransaction?.id === transaction.id) {
        setSelectedTransaction(null)
      }
    } catch (deleteError) {
      setError(deleteError.message || 'No fue posible eliminar el movimiento.')
    } finally {
      setDeletingId('')
    }
  }

  async function handleCreateCategory(payload) {
    setSavingCategory(true)
    setError('')

    try {
      const created = await createFinanceCategory(payload)
      setFinanceCategories((current) =>
        [...current, created].sort((left, right) => {
          if (left.type !== right.type) {
            return left.type.localeCompare(right.type)
          }
          return left.name.localeCompare(right.name, 'es', { sensitivity: 'base' })
        }),
      )
      return created
    } catch (submitError) {
      setError(
        submitError.message || 'No fue posible crear la categoria financiera.',
      )
      throw submitError
    } finally {
      setSavingCategory(false)
    }
  }

  const summary = useMemo(
    () => buildFinanceSummary(transactions),
    [transactions],
  )
  const chartMeta = useMemo(() => buildChartData(transactions, rangeType, activeRange), [
    transactions,
    rangeType,
    activeRange,
  ])

  return (
    <>
      <div className="admin-panel p-6 md:p-8">
        <PageHeading
          eyebrow="Finanzas"
          title="Control interno de ingresos y egresos"
          description="Registra ventas, gastos y pendientes de cobro o pago desde Supabase, con resumen financiero y evolucion visual."
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Ingresos totales" value={formatCurrency(summary.totalIncome)} />
        <SummaryCard label="Egresos totales" value={formatCurrency(summary.totalExpense)} />
        <SummaryCard label="Ganancia neta" value={formatCurrency(summary.netProfit)} />
        <SummaryCard
          label="Pendientes por cobrar"
          value={formatCurrency(summary.pendingReceivables)}
        />
        <SummaryCard
          label="Pendientes por pagar"
          value={formatCurrency(summary.pendingPayables)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <FinanceForm
          financeCategories={financeCategories}
          selectedTransaction={selectedTransaction}
          saving={saving}
          saveLabel={saveLabel}
          savingCategory={savingCategory}
          onSubmit={handleSubmit}
          onCancelEdit={() => setSelectedTransaction(null)}
          onCreateCategory={handleCreateCategory}
        />

        <div className="admin-panel p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-display text-3xl text-slate-700">Filtros y resumen</h2>
              <p className="mt-2 text-sm text-slate-500">
                Cambia el rango para revisar el comportamiento semanal, mensual, anual o por fechas personalizadas.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRangeType(option.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  rangeType === option.value
                    ? 'bg-slate-700 text-white'
                    : 'border border-dashed border-sand bg-white/80 text-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {rangeType === 'custom' ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">Desde</label>
                <input
                  type="date"
                  value={customRange.startDate}
                  onChange={(event) =>
                    setCustomRange((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Hasta</label>
                <input
                  type="date"
                  value={customRange.endDate}
                  onChange={(event) =>
                    setCustomRange((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  className="field-input"
                />
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-[1.5rem] border border-dashed border-sand bg-petal/80 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Rango actual
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {activeRange.startDate} al {activeRange.endDate}
            </p>
          </div>
        </div>
      </div>

      {loading ? <LoadingState label="Cargando movimientos..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error ? <FinanceChart data={chartMeta.data} groupedBy={chartMeta.groupedBy} /> : null}

      {!loading && !error ? (
        <div className="admin-panel overflow-hidden">
          <div className="border-b border-sand/30 px-6 py-5">
            <h2 className="font-display text-3xl text-slate-700">Movimientos</h2>
            <p className="mt-2 text-sm text-slate-500">
              Registros financieros guardados en Supabase dentro del rango seleccionado.
            </p>
          </div>

          {!transactions.length ? (
            <div className="p-6">
              <EmptyState
                title="Aun no hay movimientos"
                description="Registra tu primer ingreso, egreso o pendiente desde el formulario."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/80 text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Descripcion</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Pagado</th>
                    <th className="px-6 py-4">Restante</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Pago</th>
                    <th className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t border-sand/30">
                      <td className="px-6 py-4">{formatDate(transaction.transaction_date)}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-700">
                            {transaction.description}
                          </p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge tone={transaction.type === 'income' ? 'active' : 'inactive'}>
                          {transaction.type === 'income' ? 'Ingreso' : 'Egreso'}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge tone={transaction.status}>
                          {translateFinanceStatus(transaction.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4">{formatCurrency(transaction.amount)}</td>
                      <td className="px-6 py-4">
                        {formatCurrency(transaction.paid_amount)}
                      </td>
                      <td className="px-6 py-4">
                        {formatCurrency(transaction.remaining_amount)}
                      </td>
                      <td className="px-6 py-4">{transaction.category || 'Sin categoria'}</td>
                      <td className="px-6 py-4">
                        {transaction.payment_method || 'Sin metodo'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTransaction(transaction)}
                            className="btn-secondary"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(transaction)}
                            disabled={deletingId === transaction.id}
                            className="btn-ghost"
                          >
                            {deletingId === transaction.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="admin-panel p-6">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 font-display text-3xl text-slate-700">{value}</p>
    </div>
  )
}

function buildFinanceSummary(transactions) {
  return transactions.reduce(
    (summary, transaction) => {
      const amount = Number(transaction.amount || 0)
      const remainingAmount = Number(transaction.remaining_amount || 0)

      if (transaction.status === 'completed') {
        if (transaction.type === 'income') {
          summary.totalIncome += amount
        } else {
          summary.totalExpense += amount
        }
      }

      if (transaction.status === 'pending' || transaction.status === 'partial') {
        if (transaction.type === 'income') {
          summary.pendingReceivables += remainingAmount
        } else {
          summary.pendingPayables += remainingAmount
        }
      }

      summary.netProfit = summary.totalIncome - summary.totalExpense
      return summary
    },
    {
      totalIncome: 0,
      totalExpense: 0,
      netProfit: 0,
      pendingReceivables: 0,
      pendingPayables: 0,
    },
  )
}

function buildChartData(transactions, rangeType, activeRange) {
  const shouldGroupByMonth = rangeType === 'year'

  const map = new Map()

  transactions
    .filter((transaction) => transaction.status === 'completed')
    .forEach((transaction) => {
      const date = new Date(`${transaction.transaction_date}T00:00:00`)
      const key = shouldGroupByMonth
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : transaction.transaction_date
      const label = shouldGroupByMonth
        ? new Intl.DateTimeFormat('es-CO', {
            month: 'short',
            year: '2-digit',
          }).format(date)
        : new Intl.DateTimeFormat('es-CO', {
            day: '2-digit',
            month: 'short',
          }).format(date)

      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          income: 0,
          expense: 0,
          net: 0,
        })
      }

      const current = map.get(key)
      current[transaction.type] += Number(transaction.amount || 0)
      current.net = current.income - current.expense
    })

  return {
    groupedBy: shouldGroupByMonth ? 'month' : 'date',
    data: Array.from(map.values()).sort((left, right) => left.key.localeCompare(right.key)),
  }
}

function buildDateRange(rangeType, customRange) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (rangeType === 'week') {
    const day = today.getDay()
    const offset = day === 0 ? -6 : 1 - day
    const start = new Date(today)
    start.setDate(today.getDate() + offset)
    return {
      startDate: toDateInputValue(start),
      endDate: toDateInputValue(today),
    }
  }

  if (rangeType === 'year') {
    return {
      startDate: `${today.getFullYear()}-01-01`,
      endDate: toDateInputValue(today),
    }
  }

  if (rangeType === 'custom') {
    if (customRange.startDate && customRange.endDate && customRange.startDate > customRange.endDate) {
      return {
        startDate: customRange.endDate,
        endDate: customRange.startDate,
      }
    }

    return {
      startDate: customRange.startDate || toDateInputValue(today),
      endDate: customRange.endDate || toDateInputValue(today),
    }
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(today),
  }
}

function toDateInputValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
}

function sortTransactions(transactions) {
  return [...transactions].sort((left, right) => {
    const leftKey = `${left.transaction_date}-${left.created_at}`
    const rightKey = `${right.transaction_date}-${right.created_at}`
    return rightKey.localeCompare(leftKey)
  })
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  return Math.ceil((end - start) / 86400000)
}

function translateFinanceStatus(status) {
  if (status === 'completed') {
    return 'Completado'
  }

  if (status === 'partial') {
    return 'Parcialmente pagado'
  }

  return 'Pendiente'
}
