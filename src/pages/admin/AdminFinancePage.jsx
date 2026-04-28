import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import StatusBadge from '../../components/common/StatusBadge'
import FinanceChart from '../../components/admin/FinanceChart'
import FinanceForm from '../../components/admin/FinanceForm'
import { useToast } from '../../providers/ToastProvider'
import {
  createFinanceCategory,
  createFinanceTransaction,
  deleteFinanceTransaction,
  fetchFinanceCategories,
  fetchFinanceTransactions,
  updateFinanceTransaction,
} from '../../services/financeService'
import { formatCurrency, formatDate } from '../../utils/formatters'

const rangeOptions = [
  { value: 'week', label: 'Semana actual' },
  { value: 'month', label: 'Mes actual' },
  { value: 'year', label: 'Ano actual' },
  { value: 'custom', label: 'Rango personalizado' },
]

const movementFilters = [
  { value: 'all', label: 'Todos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'expense', label: 'Egresos' },
  { value: 'completed', label: 'Completados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'partial', label: 'Parciales' },
]

export default function AdminFinancePage() {
  const { showToast } = useToast()
  const [financeCategories, setFinanceCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [rangeType, setRangeType] = useState('month')
  const [movementFilter, setMovementFilter] = useState('all')
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
  const [completingId, setCompletingId] = useState('')
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
        showToast({
          title: 'Movimiento guardado',
          description: 'El movimiento se actualizo correctamente.',
          tone: 'success',
        })
        return
      }

      const created = await createFinanceTransaction(payload)
      setTransactions((current) => sortTransactions([created, ...current]))
      showToast({
        title: 'Movimiento guardado',
        description: 'El movimiento se registro correctamente.',
        tone: 'success',
      })
    } catch (submitError) {
      setError(submitError.message || 'No fue posible guardar el movimiento.')
      showToast({
        title: 'Error al guardar',
        description: submitError.message || 'Revisa los campos e intenta nuevamente.',
        tone: 'error',
      })
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
      setTransactions((current) => current.filter((item) => item.id !== transaction.id))

      if (selectedTransaction?.id === transaction.id) {
        setSelectedTransaction(null)
      }

      showToast({
        title: 'Elemento eliminado',
        description: 'El movimiento se elimino correctamente.',
        tone: 'success',
      })
    } catch (deleteError) {
      setError(deleteError.message || 'No fue posible eliminar el movimiento.')
      showToast({
        title: 'Error al eliminar',
        description: deleteError.message || 'No fue posible eliminar el movimiento.',
        tone: 'error',
      })
    } finally {
      setDeletingId('')
    }
  }

  async function handleMarkAsPaid(transaction) {
    const confirmed = window.confirm(
      `Marcar "${transaction.description}" como pagado por completo?`,
    )

    if (!confirmed) {
      return
    }

    try {
      setCompletingId(transaction.id)
      setError('')

      const updated = await updateFinanceTransaction(transaction.id, {
        amount: Number(transaction.amount || 0),
        paid_amount: Number(transaction.amount || 0),
        type: transaction.type,
        description: transaction.description,
        category: transaction.category,
        payment_method: transaction.payment_method || '',
        transaction_date: transaction.transaction_date,
        status: 'completed',
      })

      setTransactions((current) =>
        sortTransactions(
          current.map((item) => (item.id === transaction.id ? updated : item)),
        ),
      )

      if (selectedTransaction?.id === transaction.id) {
        setSelectedTransaction(updated)
      }

      showToast({
        title: 'Movimiento guardado',
        description: 'El movimiento se marco como pagado correctamente.',
        tone: 'success',
      })
    } catch (updateError) {
      setError(updateError.message || 'No fue posible marcar el movimiento como pagado.')
      showToast({
        title: 'Error al guardar',
        description:
          updateError.message || 'No fue posible marcar el movimiento como pagado.',
        tone: 'error',
      })
    } finally {
      setCompletingId('')
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
      showToast({
        title: 'Elemento guardado',
        description: 'La categoria financiera se creo correctamente.',
        tone: 'success',
      })
      return created
    } catch (submitError) {
      setError(submitError.message || 'No fue posible crear la categoria financiera.')
      showToast({
        title: 'Error al guardar',
        description:
          submitError.message || 'No fue posible crear la categoria financiera.',
        tone: 'error',
      })
      throw submitError
    } finally {
      setSavingCategory(false)
    }
  }

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, movementFilter),
    [transactions, movementFilter],
  )

  const summary = useMemo(
    () => buildFinanceSummary(filteredTransactions),
    [filteredTransactions],
  )

  const chartMeta = useMemo(
    () => buildChartData(filteredTransactions, rangeType),
    [filteredTransactions, rangeType],
  )

  return (
    <>
      <div className="admin-panel p-6 md:p-8">
        <PageHeading
          eyebrow="Finanzas"
          title="Control interno de ingresos y egresos"
          description="Registra ventas, gastos y pendientes de cobro o pago desde Supabase, con mayor claridad sobre utilidad real, utilidad esperada y pagos parciales."
        />
      </div>

      <div className="space-y-5">
        <section className="admin-panel p-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-3xl text-slate-700">Resumen general</h2>
            <p className="text-sm text-slate-500">
              Vista consolidada de ingresos, egresos y utilidad del periodo filtrado.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Ingresos totales"
              value={formatCurrency(summary.totalIncomeExpected)}
            />
            <SummaryCard
              label="Egresos totales"
              value={formatCurrency(summary.totalExpenseExpected)}
            />
            <SummaryCard label="Ganancia real" value={formatCurrency(summary.realProfit)} />
            <SummaryCard
              label="Ganancia esperada"
              value={formatCurrency(summary.expectedProfit)}
            />
          </div>
        </section>

        <section className="admin-panel p-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-3xl text-slate-700">Flujo de caja</h2>
            <p className="text-sm text-slate-500">
              Seguimiento de lo cobrado, lo pagado y los saldos pendientes.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Ingresos pagados" value={formatCurrency(summary.paidIncome)} />
            <SummaryCard label="Egresos pagados" value={formatCurrency(summary.paidExpense)} />
            <SummaryCard
              label="Pendientes por cobrar"
              value={formatCurrency(summary.pendingReceivables)}
            />
            <SummaryCard
              label="Pendientes por pagar"
              value={formatCurrency(summary.pendingPayables)}
            />
          </div>
        </section>
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
                Combina el rango de fechas con filtros de tipo o estado para entender mejor lo cobrado, lo pendiente y la utilidad del negocio.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRangeType(option.value)}
                className={`filter-pill ${
                  rangeType === option.value ? 'filter-pill-active' : 'filter-pill-idle'
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

          <div className="mt-6 flex flex-wrap gap-2">
            {movementFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMovementFilter(option.value)}
                className={`filter-pill ${
                  movementFilter === option.value
                    ? 'filter-pill-active'
                    : 'filter-pill-idle'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-dashed border-mist/55 bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Rango actual</p>
              <p className="mt-2 text-sm text-slate-700">
                {activeRange.startDate} al {activeRange.endDate}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-dashed border-sageDeep/80 bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                Filtro aplicado
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {movementFilters.find((option) => option.value === movementFilter)?.label}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? <LoadingState label="Cargando movimientos..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error ? (
        <FinanceChart data={chartMeta.data} groupedBy={chartMeta.groupedBy} />
      ) : null}

      {!loading && !error ? (
        <div className="admin-panel overflow-hidden">
          <div className="border-b border-sand/30 px-6 py-5">
            <h2 className="font-display text-3xl text-slate-700">Movimientos</h2>
            <p className="mt-2 text-sm text-slate-500">
              Registros guardados en Supabase dentro del rango y filtros actuales.
            </p>
          </div>

          {!filteredTransactions.length ? (
            <div className="p-6">
              <EmptyState
                title="No hay movimientos para este filtro"
                description="Prueba otro rango o cambia el filtro de tipo y estado para ver resultados."
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
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Metodo</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Pagado</th>
                    <th className="px-6 py-4">Restante</th>
                    <th className="px-6 py-4 min-w-[220px]">Progreso</th>
                    <th className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t border-sand/30 align-top">
                      <td className="px-6 py-4">{formatDate(transaction.transaction_date)}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-700">{transaction.description}</p>
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
                      <td className="px-6 py-4">{transaction.category || 'Sin categoria'}</td>
                      <td className="px-6 py-4">
                        {transaction.payment_method || 'Sin metodo'}
                      </td>
                      <td className="px-6 py-4">{formatCurrency(transaction.amount)}</td>
                      <td className="px-6 py-4">{formatCurrency(transaction.paid_amount)}</td>
                      <td className="px-6 py-4">
                        {formatCurrency(transaction.remaining_amount)}
                      </td>
                      <td className="px-6 py-4">
                        <PaymentProgress transaction={transaction} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex min-w-[210px] flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTransaction(transaction)}
                            className="btn-secondary"
                          >
                            Editar
                          </button>
                          {transaction.status !== 'completed' ? (
                            <button
                              type="button"
                              onClick={() => handleMarkAsPaid(transaction)}
                              disabled={completingId === transaction.id}
                              className="btn-primary"
                            >
                              {completingId === transaction.id
                                ? 'Actualizando...'
                                : 'Marcar como pagado'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(transaction)}
                            disabled={deletingId === transaction.id || completingId === transaction.id}
                            className="btn-danger"
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
    <div className="card-dashed min-w-0 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 break-words font-display text-[clamp(1.9rem,3vw,2.6rem)] leading-tight text-slate-700">
        {value}
      </p>
    </div>
  )
}

function PaymentProgress({ transaction }) {
  const progress = getProgressPercentage(transaction)
  const barTone =
    transaction.status === 'completed'
      ? 'bg-sage'
      : transaction.status === 'pending'
        ? 'bg-mist/28'
        : 'bg-sun/75'

  return (
    <div className="space-y-2">
      <div className="h-3 overflow-hidden rounded-full bg-mist/15">
        <div
          className={`h-full rounded-full transition-all ${barTone}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-1 text-xs text-slate-500">
        <p>
          Pagado: {formatCurrency(transaction.paid_amount)} / {formatCurrency(transaction.amount)}
        </p>
        <p>Restante: {formatCurrency(transaction.remaining_amount)}</p>
      </div>
    </div>
  )
}

function filterTransactions(transactions, movementFilter) {
  if (movementFilter === 'all') {
    return transactions
  }

  return transactions.filter((transaction) => {
    if (movementFilter === 'income' || movementFilter === 'expense') {
      return transaction.type === movementFilter
    }

    return transaction.status === movementFilter
  })
}

function buildFinanceSummary(transactions) {
  return transactions.reduce(
    (summary, transaction) => {
      const amount = Number(transaction.amount || 0)
      const paidAmount = Number(transaction.paid_amount || 0)
      const remainingAmount = Number(transaction.remaining_amount || 0)

      if (transaction.type === 'income') {
        summary.totalIncomeExpected += amount
        summary.paidIncome += paidAmount
      } else {
        summary.totalExpenseExpected += amount
        summary.paidExpense += paidAmount
      }

      if (transaction.status === 'pending' || transaction.status === 'partial') {
        if (transaction.type === 'income') {
          summary.pendingReceivables += remainingAmount
        } else {
          summary.pendingPayables += remainingAmount
        }
      }

      summary.realProfit = summary.paidIncome - summary.paidExpense
      summary.expectedProfit =
        summary.totalIncomeExpected - summary.totalExpenseExpected

      return summary
    },
    {
      totalIncomeExpected: 0,
      totalExpenseExpected: 0,
      paidIncome: 0,
      paidExpense: 0,
      realProfit: 0,
      expectedProfit: 0,
      pendingReceivables: 0,
      pendingPayables: 0,
    },
  )
}

function buildChartData(transactions, rangeType) {
  const shouldGroupByMonth = rangeType === 'year'
  const map = new Map()

  transactions.forEach((transaction) => {
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
        paidIncome: 0,
        paidExpense: 0,
        realProfit: 0,
        expectedProfit: 0,
      })
    }

    const current = map.get(key)
    const paidAmount = Number(transaction.paid_amount || 0)
    const amount = Number(transaction.amount || 0)

    if (transaction.type === 'income') {
      current.paidIncome += paidAmount
      current.expectedProfit += amount
    } else {
      current.paidExpense += paidAmount
      current.expectedProfit -= amount
    }

    current.realProfit = current.paidIncome - current.paidExpense
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
    if (
      customRange.startDate &&
      customRange.endDate &&
      customRange.startDate > customRange.endDate
    ) {
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

function translateFinanceStatus(status) {
  if (status === 'completed') {
    return 'Completado'
  }

  if (status === 'partial') {
    return 'Parcialmente pagado'
  }

  return 'Pendiente'
}

function getProgressPercentage(transaction) {
  const amount = Number(transaction.amount || 0)
  const paidAmount = Number(transaction.paid_amount || 0)

  if (amount <= 0) {
    return 0
  }

  return Math.max(0, Math.min(100, (paidAmount / amount) * 100))
}
