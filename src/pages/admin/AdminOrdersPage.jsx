import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import OrderForm from '../../components/admin/OrderForm'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import StatusBadge from '../../components/common/StatusBadge'
import { useToast } from '../../providers/ToastProvider'
import { fetchAvailableEssences } from '../../services/essenceService'
import { fetchActiveProductOptions } from '../../services/productService'
import { createOrder, deleteOrder, fetchOrders, updateOrder } from '../../services/orderService'
import { formatCurrency } from '../../utils/formatters'

const weekdayLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

export default function AdminOrdersPage() {
  const { showToast } = useToast()
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [scents, setScents] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedDate, setSelectedDate] = useState(getTodayDate())
  const [monthCursor, setMonthCursor] = useState(getMonthStart(new Date()))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadOrdersModule()
  }, [])

  async function loadOrdersModule() {
    try {
      setLoading(true)
      setError('')
      const [orderRows, productRows, scentRows] = await Promise.all([
        fetchOrders(),
        fetchActiveProductOptions(),
        fetchAvailableEssences().catch(() => []),
      ])
      setOrders(sortOrders(orderRows))
      setProducts(productRows)
      setScents(scentRows)
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar los pedidos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    setSaving(true)
    setSaveLabel(selectedOrder ? 'Actualizando...' : 'Guardando...')
    setError('')

    try {
      if (selectedOrder) {
        const updated = await updateOrder(selectedOrder.id, payload)
        setOrders((current) =>
          sortOrders(current.map((order) => (order.id === selectedOrder.id ? updated : order))),
        )
        setSelectedOrder(null)
        setSelectedDate(updated.delivery_date)
        setMonthCursor(getMonthStart(new Date(`${updated.delivery_date}T00:00:00`)))
        showToast({
          title: 'Pedido actualizado',
          description: 'El pedido se actualizo correctamente.',
          tone: 'success',
        })
        return
      }

      const created = await createOrder(payload)
      setOrders((current) => sortOrders([...current, created]))
      setSelectedDate(created.delivery_date)
      setMonthCursor(getMonthStart(new Date(`${created.delivery_date}T00:00:00`)))
      showToast({
        title: 'Pedido creado',
        description: 'El pedido se guardo correctamente.',
        tone: 'success',
      })
    } catch (submitError) {
      setError(submitError.message || 'No fue posible guardar el pedido.')
      showToast({
        title: 'Error al guardar',
        description: submitError.message || 'No fue posible guardar el pedido.',
        tone: 'error',
      })
      throw submitError
    } finally {
      setSaving(false)
      setSaveLabel('')
    }
  }

  async function handleDelete(order) {
    const confirmed = window.confirm('¿Seguro que deseas eliminar este elemento?')
    if (!confirmed) {
      return
    }

    try {
      setDeletingId(order.id)
      setError('')
      await deleteOrder(order.id)
      setOrders((current) => current.filter((entry) => entry.id !== order.id))
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null)
      }
      showToast({
        title: 'Pedido eliminado',
        description: 'El pedido se elimino correctamente.',
        tone: 'success',
      })
    } catch (deleteError) {
      setError(deleteError.message || 'No fue posible eliminar el pedido.')
      showToast({
        title: 'Error al guardar',
        description: deleteError.message || 'No fue posible eliminar el pedido.',
        tone: 'error',
      })
    } finally {
      setDeletingId('')
    }
  }

  function handleEdit(order) {
    setSelectedOrder(order)
    setSelectedDate(order.delivery_date)
    setMonthCursor(getMonthStart(new Date(`${order.delivery_date}T00:00:00`)))
  }

  const ordersByDate = useMemo(() => groupOrdersByDate(orders), [orders])
  const calendarDays = useMemo(() => buildCalendarDays(monthCursor), [monthCursor])
  const selectedDayOrders = useMemo(
    () => sortOrders(ordersByDate[selectedDate] ?? []),
    [ordersByDate, selectedDate],
  )
  const summary = useMemo(() => buildOrdersSummary(orders), [orders])
  const upcomingOrders = useMemo(() => buildUpcomingOrders(orders), [orders])

  return (
    <>
      <div className="admin-panel p-6 md:p-8">
        <PageHeading
          eyebrow="Pedidos"
          title="Calendario interno de entregas"
          description="Organiza entregas futuras, pedidos por fecha y seguimiento comercial sin mezclarlo todavia con Finanzas."
          actions={
            <Link to="/admin/productos" className="btn-secondary">
              Ver catalogo admin
            </Link>
          }
        />
      </div>

      {loading ? <LoadingState label="Cargando pedidos..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Pedidos de hoy" value={summary.todayCount} />
            <MetricCard label="Proximos pedidos" value={summary.upcomingCount} />
            <MetricCard label="Pendientes" value={summary.pendingCount} />
            <MetricCard label="Entregados" value={summary.deliveredCount} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <OrderForm
              products={products}
              scents={scents}
              selectedOrder={selectedOrder}
              saving={saving}
              saveLabel={saveLabel}
              onSubmit={handleSubmit}
              onCancelEdit={() => setSelectedOrder(null)}
            />

            <div className="space-y-6">
              <section className="admin-panel p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="font-display text-3xl text-slate-700">Calendario</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Selecciona un dia para ver sus entregas y detectar cargas futuras.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMonthCursor(shiftMonth(monthCursor, -1))}
                      className="btn-secondary px-4"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonthCursor(shiftMonth(monthCursor, 1))}
                      className="btn-secondary px-4"
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-dashed border-mist/55 bg-white/82 p-4 text-center">
                  <p className="font-display text-2xl text-slate-700">
                    {formatMonthYear(monthCursor)}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-7 gap-2 text-center">
                  {weekdayLabels.map((label) => (
                    <div
                      key={label}
                      className="py-2 text-xs uppercase tracking-[0.22em] text-slate-500"
                    >
                      {label}
                    </div>
                  ))}

                  {calendarDays.map((day) => {
                    const dayOrders = ordersByDate[day.dateKey] ?? []
                    const isSelected = day.dateKey === selectedDate
                    const isCurrentMonth = day.isCurrentMonth

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => setSelectedDate(day.dateKey)}
                        className={`min-h-[84px] rounded-[1.35rem] border p-2 text-left transition ${
                          isSelected
                            ? 'border-mistDeep bg-mist/18 shadow-soft'
                            : isCurrentMonth
                              ? 'border-dashed border-sand/50 bg-white/82 hover:-translate-y-0.5'
                              : 'border-dashed border-sand/30 bg-white/45 text-slate-400'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold">{day.dayNumber}</span>
                          {dayOrders.length ? (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getCalendarChipClass(dayOrders)}`}>
                              {dayOrders.length}
                            </span>
                          ) : null}
                        </div>
                        {dayOrders.length ? (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {dayOrders.slice(0, 3).map((order) => (
                              <span
                                key={order.id}
                                className={`h-2.5 w-2.5 rounded-full ${getOrderDotClass(order.status)}`}
                              />
                            ))}
                          </div>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="admin-panel p-6">
                <div className="flex flex-col gap-2">
                  <h2 className="font-display text-3xl text-slate-700">
                    Pedidos del {formatOrderDate(selectedDate)}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Vista puntual del dia seleccionado en el calendario.
                  </p>
                </div>

                {!selectedDayOrders.length ? (
                  <div className="mt-5">
                    <EmptyState
                      title="Sin pedidos para este dia"
                      description="Selecciona otra fecha o crea un nuevo pedido para comenzar a llenar el calendario."
                    />
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {selectedDayOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        deleting={deletingId === order.id}
                        onEdit={() => handleEdit(order)}
                        onDelete={() => handleDelete(order)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>

          <section className="admin-panel p-6">
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-3xl text-slate-700">Proximos pedidos</h2>
              <p className="text-sm text-slate-500">
                Lista cronologica para organizar produccion, despacho y comunicacion con clientes.
              </p>
            </div>

            {!upcomingOrders.length ? (
              <div className="mt-5">
                <EmptyState
                  title="No hay proximos pedidos"
                  description="Cuando registres nuevas entregas futuras apareceran aqui."
                />
              </div>
            ) : (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {upcomingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    deleting={deletingId === order.id}
                    onEdit={() => handleEdit(order)}
                    onDelete={() => handleDelete(order)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="admin-panel p-6">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 font-display text-5xl text-slate-700">{value}</p>
    </div>
  )
}

function OrderCard({ order, deleting, onEdit, onDelete }) {
  return (
    <div className="rounded-[1.7rem] border border-dashed border-mist/55 bg-white/88 p-5 shadow-soft">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-700">{order.customer_name}</p>
            <StatusBadge tone={order.status}>
              {translateOrderStatus(order.status)}
            </StatusBadge>
            <StatusBadge tone={order.payment_status}>
              {translatePaymentStatus(order.payment_status)}
            </StatusBadge>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {formatOrderDate(order.delivery_date)}
            {order.delivery_time ? ` · ${formatTime(order.delivery_time)}` : ''}
          </p>
          {order.delivery_address ? (
            <p className="mt-2 text-sm text-slate-500">{order.delivery_address}</p>
          ) : null}
        </div>
        <div className="rounded-[1.4rem] border border-dashed border-sand/60 bg-petal/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Total</p>
          <p className="mt-2 text-lg font-semibold text-slate-700">
            {formatCurrency(order.total_amount)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-500 md:grid-cols-2">
        <p className="min-w-0">
          <span className="font-semibold text-slate-600">Productos:</span>{' '}
          <span title={order.itemsSummary || 'Pedido manual'}>
            {order.itemsSummary || 'Pedido manual'}
          </span>
        </p>
        <p>
          <span className="font-semibold text-slate-600">Abono:</span>{' '}
          {formatCurrency(order.paid_amount)}
        </p>
      </div>

      {order.selected_scents?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {order.selected_scents.map((scent) => (
            <span
              key={`${order.id}-${scent}`}
              className="rounded-full border border-dashed border-blush/60 bg-blush/12 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {scent}
            </span>
          ))}
        </div>
      ) : null}

      {order.notes ? (
        <p className="mt-3 text-sm italic text-slate-400" title={order.notes}>
          {order.notes}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onEdit} className="btn-secondary">
          Editar
        </button>
        <a
          href={buildOrderWhatsAppLink(order)}
          target="_blank"
          rel="noreferrer"
          className={`btn-primary ${order.customer_phone ? '' : 'pointer-events-none opacity-60'}`}
        >
          Enviar WhatsApp
        </a>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="btn-danger disabled:cursor-not-allowed disabled:opacity-70"
        >
          {deleting ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>
    </div>
  )
}

function buildOrdersSummary(orders) {
  const today = getTodayDate()

  return {
    todayCount: orders.filter((order) => order.delivery_date === today).length,
    upcomingCount: orders.filter(
      (order) =>
        order.delivery_date >= today &&
        order.status !== 'delivered' &&
        order.status !== 'cancelled',
    ).length,
    pendingCount: orders.filter((order) => order.status === 'pending').length,
    deliveredCount: orders.filter((order) => order.status === 'delivered').length,
  }
}

function buildUpcomingOrders(orders) {
  const today = getTodayDate()
  return sortOrders(
    orders.filter(
      (order) =>
        order.delivery_date >= today &&
        order.status !== 'delivered' &&
        order.status !== 'cancelled',
    ),
  )
}

function groupOrdersByDate(orders) {
  return orders.reduce((accumulator, order) => {
    const key = order.delivery_date
    accumulator[key] = accumulator[key] ? [...accumulator[key], order] : [order]
    return accumulator
  }, {})
}

function buildCalendarDays(monthDate) {
  const startOfMonth = getMonthStart(monthDate)
  const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0)
  const firstWeekday = (startOfMonth.getDay() + 6) % 7
  const days = []

  const gridStart = new Date(startOfMonth)
  gridStart.setDate(startOfMonth.getDate() - firstWeekday)

  for (let index = 0; index < 42; index += 1) {
    const current = new Date(gridStart)
    current.setDate(gridStart.getDate() + index)
    days.push({
      dateKey: toDateKey(current),
      dayNumber: current.getDate(),
      isCurrentMonth: current.getMonth() === startOfMonth.getMonth(),
    })
  }

  if (endOfMonth.getDay() !== 0) {
    return days
  }

  return days
}

function getCalendarChipClass(dayOrders) {
  if (dayOrders.some((order) => order.status === 'pending')) {
    return 'bg-sun/80 text-slate-700'
  }

  if (dayOrders.some((order) => order.status === 'preparing')) {
    return 'bg-mist/28 text-slate-700'
  }

  if (dayOrders.some((order) => order.status === 'ready')) {
    return 'bg-blush/65 text-slate-700'
  }

  if (dayOrders.some((order) => order.status === 'delivered')) {
    return 'bg-sage text-slate-700'
  }

  return 'bg-sand/45 text-slate-700'
}

function getOrderDotClass(status) {
  if (status === 'pending') {
    return 'bg-sunDeep'
  }

  if (status === 'preparing') {
    return 'bg-mistDeep'
  }

  if (status === 'ready') {
    return 'bg-roseDeep'
  }

  if (status === 'delivered') {
    return 'bg-sageDeep'
  }

  return 'bg-slate-300'
}

function sortOrders(orders) {
  return [...orders].sort((left, right) => {
    const leftKey = `${left.delivery_date}-${left.delivery_time || '99:99'}-${left.created_at}`
    const rightKey = `${right.delivery_date}-${right.delivery_time || '99:99'}-${right.created_at}`
    return leftKey.localeCompare(rightKey)
  })
}

function translateOrderStatus(status) {
  if (status === 'preparing') {
    return 'En preparacion'
  }

  if (status === 'ready') {
    return 'Listo'
  }

  if (status === 'delivered') {
    return 'Entregado'
  }

  if (status === 'cancelled') {
    return 'Cancelado'
  }

  return 'Pendiente'
}

function translatePaymentStatus(status) {
  if (status === 'paid') {
    return 'Pagado'
  }

  if (status === 'partial') {
    return 'Parcial'
  }

  return 'Pendiente'
}

function buildOrderWhatsAppLink(order) {
  const phone = normalizePhone(order.customer_phone)
  if (!phone) {
    return '#'
  }

  const intro = `Hola ${order.customer_name}, te confirmamos tu pedido para el ${formatOrderDate(order.delivery_date)}${order.delivery_time ? ` a las ${formatTime(order.delivery_time)}` : ''}.`
  const productLines = (order.items ?? [])
    .map((item) => `- ${item.product_name} x ${item.quantity}`)
    .join('\n')
  const scentsLine = order.selected_scents?.length
    ? `\n\nEsencias: ${order.selected_scents.join(', ')}`
    : ''
  const message = productLines
    ? `${intro}\n\n${productLines}${scentsLine}`
    : `${intro}${scentsLine}`

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) {
    return ''
  }

  if (digits.startsWith('57')) {
    return digits
  }

  if (digits.length === 10) {
    return `57${digits}`
  }

  return digits
}

function formatTime(value) {
  if (!value) {
    return ''
  }

  const [hours = '00', minutes = '00'] = String(value).split(':')
  return `${hours}:${minutes}`
}

function getTodayDate() {
  return toDateKey(new Date())
}

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function shiftMonth(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatMonthYear(date) {
  return new Intl.DateTimeFormat('es-CO', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatOrderDate(dateString) {
  if (!dateString) {
    return 'Sin fecha'
  }

  const [year, month, day] = String(dateString).split('-')

  if (!year || !month || !day) {
    return dateString
  }

  return `${day}/${month}/${year}`
}
