import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import StatusBadge from '../../components/common/StatusBadge'
import FinanceChart from '../../components/admin/FinanceChart'
import FinanceForm from '../../components/admin/FinanceForm'
import { useToast } from '../../providers/ToastProvider'
import { fetchActiveProductOptions } from '../../services/productService'
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
  { value: 'day', label: 'Dia actual' },
  { value: 'week', label: 'Semana actual' },
  { value: 'month', label: 'Mes actual' },
  { value: 'year', label: 'Año actual' },
  { value: 'custom', label: 'Rango personalizado' },
]

const typeFilters = [
  { value: 'all', label: 'Todos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'expense', label: 'Egresos' },
]

const statusFilters = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'completed', label: 'Completados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'partial', label: 'Parciales' },
]

export default function AdminFinancePage() {
  const { showToast } = useToast()
  const [financeCategories, setFinanceCategories] = useState([])
  const [products, setProducts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [rangeType, setRangeType] = useState('month')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
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
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const activeRange = useMemo(
    () => buildDateRange(rangeType, customRange),
    [rangeType, customRange],
  )

  useEffect(() => {
    loadCategories()
    loadProducts()
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

  async function loadProducts() {
    try {
      const rows = await fetchActiveProductOptions()
      setProducts(rows)
    } catch (loadError) {
      setProducts([])
      showToast({
        title: 'Error al cargar productos',
        description:
          loadError.message || 'No fue posible cargar los productos activos del catalogo.',
        tone: 'error',
      })
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
        const updated = await updateFinanceTransaction(
          selectedTransaction.id,
          payload,
          selectedTransaction,
        )
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
        product_id: transaction.product_id || null,
        type: transaction.type,
        description: transaction.description,
        category: transaction.category,
        transaction_date: transaction.transaction_date,
        payments: buildPaidPayments(transaction),
      }, transaction)

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
    () => filterTransactions(transactions, typeFilter, statusFilter),
    [transactions, typeFilter, statusFilter],
  )

  const summary = useMemo(
    () => buildFinanceSummary(filteredTransactions),
    [filteredTransactions],
  )

  const chartMeta = useMemo(
    () => buildChartData(filteredTransactions, rangeType),
    [filteredTransactions, rangeType],
  )

  const activeFilterLabel = useMemo(() => {
    const typeLabel = typeFilters.find((option) => option.value === typeFilter)?.label || 'Todos'
    const statusLabel =
      statusFilters.find((option) => option.value === statusFilter)?.label ||
      'Todos los estados'
    return `${typeLabel}, ${statusLabel}`
  }, [typeFilter, statusFilter])

  async function handleExportExcel() {
    if (!filteredTransactions.length) {
      showToast({
        title: 'No hay datos para exportar',
        description: 'Ajusta el rango o los filtros para generar el archivo.',
        tone: 'warning',
      })
      return
    }

    try {
      setExporting(true)

      const workbook = XLSX.utils.book_new()
      const summarySheet = XLSX.utils.aoa_to_sheet(
        buildSummarySheetRows(activeRange, activeFilterLabel, summary),
      )
      const movementsSheet = XLSX.utils.json_to_sheet(
        filteredTransactions.map((transaction) => ({
          Fecha: transaction.transaction_date || '',
          Tipo: transaction.type === 'income' ? 'Ingreso' : 'Egreso',
          Estado: translateFinanceStatus(transaction.status),
          Producto: transaction.product?.name || '',
          Categoria: transaction.category || 'Sin categoria',
          Descripcion: transaction.description || '',
          'Metodo de pago': transaction.payment_method || 'Sin metodo',
          Total: Number(transaction.amount || 0),
          Pagado: Number(transaction.paid_amount || 0),
          Restante: Number(transaction.remaining_amount || 0),
        })),
      )

      applyCurrencyFormat(summarySheet, ['B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11'])
      applyCurrencyFormatByHeader(movementsSheet, ['Total', 'Pagado', 'Restante'])
      summarySheet['!cols'] = [{ wch: 24 }, { wch: 22 }]
      movementsSheet['!cols'] = [
        { wch: 14 },
        { wch: 12 },
        { wch: 24 },
        { wch: 22 },
        { wch: 20 },
        { wch: 38 },
        { wch: 20 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
      ]

      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')
      XLSX.utils.book_append_sheet(workbook, movementsSheet, 'Movimientos')
      XLSX.writeFile(workbook, `finanzas-cataela-${getTodayFileStamp()}.xlsx`)

      showToast({
        title: 'Exportacion lista',
        description: 'El archivo Excel se genero correctamente.',
        tone: 'success',
      })
    } catch (exportError) {
      showToast({
        title: 'Error al exportar',
        description: exportError.message || 'No fue posible generar el archivo Excel.',
        tone: 'error',
      })
    } finally {
      setExporting(false)
    }
  }

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
          products={products}
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
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-70"
            >
              {exporting ? 'Exportando...' : 'Exportar Excel'}
            </button>
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
            {typeFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(option.value)}
                className={`filter-pill ${
                  typeFilter === option.value
                    ? 'filter-pill-active'
                    : 'filter-pill-idle'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {statusFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`filter-pill ${
                  statusFilter === option.value
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
                {activeFilterLabel}
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
                          <p className="font-semibold text-slate-700">
                            {buildTransactionLabel(transaction)}
                          </p>
                          {shouldShowProductMeta(transaction) ? (
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                              Producto: {transaction.product.name}
                            </p>
                          ) : null}
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

function buildTransactionLabel(transaction) {
  if (!transaction.product?.name) {
    return transaction.description
  }

  const trimmedDescription = String(transaction.description || '').trim()
  const productName = transaction.product.name

  if (!trimmedDescription) {
    return `Venta - ${productName}`
  }

  if (trimmedDescription.toLowerCase().includes(productName.toLowerCase())) {
    return trimmedDescription
  }

  return `${trimmedDescription} - ${productName}`
}

function shouldShowProductMeta(transaction) {
  if (!transaction.product?.name) {
    return false
  }

  const trimmedDescription = String(transaction.description || '').trim().toLowerCase()
  return !trimmedDescription.includes(transaction.product.name.toLowerCase())
}

function buildPaidPayments(transaction) {
  const mappedPayments = (transaction.payments ?? []).map((payment) => ({
    payment_method: payment.payment_method || '',
    amount: Number(payment.amount || 0),
    payment_date: payment.payment_date || transaction.transaction_date || getTodayDate(),
    note: payment.note || '',
  }))
  const existingPayments =
    mappedPayments.length || Number(transaction.paid_amount || 0) <= 0
      ? mappedPayments
      : [
          {
            payment_method: transaction.payment_method || 'Pago registrado',
            amount: Number(transaction.paid_amount || 0),
            payment_date: transaction.transaction_date || getTodayDate(),
            note: 'Pago migrado desde un registro anterior.',
          },
        ]

  const currentPaidAmount = existingPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  )
  const remainingAmount = Math.max(0, Number(transaction.amount || 0) - currentPaidAmount)

  if (remainingAmount <= 0) {
    return existingPayments
  }

  return [
    ...existingPayments,
    {
      payment_method:
        existingPayments[0]?.payment_method || transaction.payment_method || 'Pago completado',
      amount: remainingAmount,
      payment_date: getTodayDate(),
      note: 'Pago completado desde el panel.',
    },
  ]
}

function filterTransactions(transactions, typeFilter, statusFilter) {
  return transactions.filter((transaction) => {
    const matchesType = typeFilter === 'all' ? true : transaction.type === typeFilter
    const matchesStatus = statusFilter === 'all' ? true : transaction.status === statusFilter
    return matchesType && matchesStatus
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

  if (rangeType === 'day') {
    return {
      startDate: toDateInputValue(today),
      endDate: toDateInputValue(today),
    }
  }

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

function buildSummarySheetRows(activeRange, activeFilterLabel, summary) {
  return [
    ['Resumen financiero'],
    [`Rango: ${activeRange.startDate} al ${activeRange.endDate}`],
    [`Filtro: ${activeFilterLabel}`],
    [],
    ['Ingresos totales', Number(summary.totalIncomeExpected || 0)],
    ['Egresos totales', Number(summary.totalExpenseExpected || 0)],
    ['Ganancia real', Number(summary.realProfit || 0)],
    ['Ganancia esperada', Number(summary.expectedProfit || 0)],
    ['Pendientes por cobrar', Number(summary.pendingReceivables || 0)],
    ['Pendientes por pagar', Number(summary.pendingPayables || 0)],
    ['Ingresos pagados', Number(summary.paidIncome || 0)],
    ['Egresos pagados', Number(summary.paidExpense || 0)],
  ]
}

function applyCurrencyFormat(sheet, cellRefs) {
  cellRefs.forEach((cellRef) => {
    if (sheet[cellRef]) {
      sheet[cellRef].z = '"COP" #,##0'
    }
  })
}

function applyCurrencyFormatByHeader(sheet, headers) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const headerMap = {}

  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const headerCell = sheet[XLSX.utils.encode_cell({ r: 0, c: column })]
    if (headerCell?.v) {
      headerMap[headerCell.v] = column
    }
  }

  headers.forEach((header) => {
    const column = headerMap[header]

    if (column === undefined) {
      return
    }

    for (let row = 1; row <= range.e.r; row += 1) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: column })
      if (sheet[cellRef]) {
        sheet[cellRef].z = '"COP" #,##0'
      }
    }
  })
}

function getTodayFileStamp() {
  return new Date().toISOString().slice(0, 10)
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}
