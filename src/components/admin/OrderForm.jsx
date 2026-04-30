import { useEffect, useMemo, useState } from 'react'
import { formatCurrency } from '../../utils/formatters'

const orderStatusOptions = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'preparing', label: 'En preparacion' },
  { value: 'ready', label: 'Listo para entregar' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
]

const paymentStatusOptions = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'partial', label: 'Parcial' },
  { value: 'paid', label: 'Pagado' },
]

const initialState = {
  customer_name: '',
  customer_phone: '',
  delivery_date: '',
  delivery_time: '',
  delivery_address: '',
  status: 'pending',
  payment_status: 'pending',
  paid_amount: '',
  notes: '',
  items: [],
}

function createEmptyItem() {
  return {
    id: `order-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    product_id: '',
    product_name: '',
    unit_price: '',
    quantity: 1,
    custom_description: '',
  }
}

export default function OrderForm({
  products = [],
  selectedOrder,
  saving,
  saveLabel,
  onSubmit,
  onCancelEdit,
}) {
  const [formValues, setFormValues] = useState(initialState)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedOrder) {
      setFormValues({
        ...initialState,
        delivery_date: getTodayDate(),
      })
      setFieldErrors({})
      setError('')
      return
    }

    setFormValues({
      customer_name: selectedOrder.customer_name || '',
      customer_phone: selectedOrder.customer_phone || '',
      delivery_date: selectedOrder.delivery_date || getTodayDate(),
      delivery_time: selectedOrder.delivery_time || '',
      delivery_address: selectedOrder.delivery_address || '',
      status: selectedOrder.status || 'pending',
      payment_status: selectedOrder.payment_status || 'pending',
      paid_amount: selectedOrder.paid_amount ?? '',
      notes: selectedOrder.notes || '',
      items: buildInitialItems(selectedOrder),
    })
    setFieldErrors({})
    setError('')
  }, [selectedOrder])

  const normalizedItems = useMemo(
    () => normalizeDraftItems(formValues.items),
    [formValues.items],
  )

  const totalAmount = useMemo(
    () =>
      normalizedItems.reduce(
        (sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0),
        0,
      ),
    [normalizedItems],
  )

  const paidAmount = useMemo(() => {
    const numericPaid = Number(formValues.paid_amount || 0)
    return Math.max(0, Math.min(numericPaid, totalAmount))
  }, [formValues.paid_amount, totalAmount])

  const remainingAmount = Math.max(0, totalAmount - paidAmount)

  useEffect(() => {
    setFormValues((current) => {
      const nextPaymentStatus = derivePaymentStatus(totalAmount, paidAmount, current.payment_status)
      const nextPaidAmount = totalAmount <= 0 ? '' : current.paid_amount

      if (
        nextPaymentStatus === current.payment_status &&
        nextPaidAmount === current.paid_amount
      ) {
        return current
      }

      return {
        ...current,
        payment_status: nextPaymentStatus,
        paid_amount: nextPaidAmount,
      }
    })
  }, [totalAmount, paidAmount])

  function updateValue(field, value) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))
    clearFieldError(field)
  }

  function clearFieldError(field) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      const nextErrors = { ...current }
      delete nextErrors[field]
      return nextErrors
    })
  }

  function handleAddItem() {
    setFormValues((current) => ({
      ...current,
      items: [...current.items, createEmptyItem()],
    }))
    clearFieldError('items')
  }

  function handleRemoveItem(index) {
    setFormValues((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }))
    clearFieldError('items')
  }

  function handleItemChange(index, field, value) {
    setFormValues((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item
        }

        if (field === 'product_id') {
          const selectedProduct = products.find((product) => product.id === value)
          return {
            ...item,
            product_id: value,
            product_name: selectedProduct?.name || '',
            unit_price:
              selectedProduct && item.unit_price === ''
                ? String(selectedProduct.price ?? 0)
                : selectedProduct && !item.custom_description
                  ? String(selectedProduct.price ?? 0)
                  : item.unit_price,
          }
        }

        if (field === 'quantity') {
          return {
            ...item,
            quantity: value === '' ? '' : Math.max(1, Math.floor(Number(value) || 1)),
          }
        }

        return {
          ...item,
          [field]: value,
        }
      }),
    }))
    clearFieldError('items')
  }

  function handlePaymentStatusChange(nextStatus) {
    setFormValues((current) => {
      if (nextStatus === 'pending') {
        return {
          ...current,
          payment_status: nextStatus,
          paid_amount: '',
        }
      }

      if (nextStatus === 'paid') {
        return {
          ...current,
          payment_status: nextStatus,
          paid_amount: String(totalAmount || 0),
        }
      }

      const currentPaid = Number(current.paid_amount || 0)
      const suggestedPartial =
        totalAmount > 1 ? Math.max(1, Math.floor(totalAmount / 2)) : totalAmount

      return {
        ...current,
        payment_status: nextStatus,
        paid_amount:
          currentPaid > 0 && currentPaid < totalAmount
            ? String(currentPaid)
            : String(suggestedPartial || ''),
      }
    })
    clearFieldError('payment_status')
    clearFieldError('paid_amount')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {}

    if (!formValues.customer_name.trim()) {
      nextErrors.customer_name = 'Este campo es obligatorio.'
    }

    if (!formValues.delivery_date) {
      nextErrors.delivery_date = 'Este campo es obligatorio.'
    }

    const cleanItems = normalizedItems.filter(
      (item) =>
        item.product_id || item.custom_description || item.unit_price !== '' || item.quantity !== '',
    )

    for (const item of cleanItems) {
      if (!item.product_id && !item.custom_description.trim()) {
        nextErrors.items = 'Cada item necesita un producto o una descripcion personalizada.'
        break
      }

      if (Number(item.quantity || 0) < 1) {
        nextErrors.items = 'Cada item debe tener una cantidad valida.'
        break
      }

      if (item.unit_price === '' || Number(item.unit_price || 0) < 0) {
        nextErrors.items = 'Cada item debe tener un precio unitario valido.'
        break
      }
    }

    if (Number(formValues.paid_amount || 0) > totalAmount) {
      nextErrors.paid_amount = 'El abono no puede superar el total del pedido.'
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      setError('Revisa los campos del pedido.')
      return
    }

    setFieldErrors({})
    setError('')

    const normalizedPaymentStatus = derivePaymentStatus(totalAmount, paidAmount, formValues.payment_status)

    try {
      await onSubmit({
        ...formValues,
        customer_name: formValues.customer_name.trim(),
        customer_phone: formValues.customer_phone.trim(),
        delivery_address: formValues.delivery_address.trim(),
        notes: formValues.notes.trim(),
        payment_status: normalizedPaymentStatus,
        paid_amount: paidAmount,
        items: cleanItems.map((item) => ({
          ...item,
          product_name:
            item.product_name ||
            products.find((product) => product.id === item.product_id)?.name ||
            item.custom_description,
        })),
      })

      if (!selectedOrder) {
        resetForm()
      }
    } catch (submitError) {
      setError(submitError.message || 'No fue posible guardar el pedido.')
    }
  }

  function resetForm() {
    setFormValues({
      ...initialState,
      delivery_date: getTodayDate(),
    })
    setFieldErrors({})
    setError('')
  }

  return (
    <form onSubmit={handleSubmit} className="admin-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-slate-700">
            {selectedOrder ? 'Editar pedido' : 'Nuevo pedido'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Organiza entregas futuras, productos y abonos sin afectar Finanzas todavia.
          </p>
        </div>
        {selectedOrder ? (
          <button type="button" onClick={onCancelEdit} className="btn-secondary">
            Nuevo
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Nombre del cliente" error={fieldErrors.customer_name} required>
          <input
            value={formValues.customer_name}
            onChange={(event) => updateValue('customer_name', event.target.value)}
            className={getFieldInputClassName(fieldErrors.customer_name)}
            placeholder="Ej: Maria Fernanda"
          />
        </Field>

        <Field label="Telefono">
          <input
            value={formValues.customer_phone}
            onChange={(event) => updateValue('customer_phone', event.target.value)}
            className="field-input"
            placeholder="Ej: 3053211112"
          />
        </Field>

        <Field label="Fecha de entrega" error={fieldErrors.delivery_date} required>
          <input
            type="date"
            value={formValues.delivery_date}
            onChange={(event) => updateValue('delivery_date', event.target.value)}
            className={getFieldInputClassName(fieldErrors.delivery_date)}
          />
        </Field>

        <Field label="Hora de entrega">
          <input
            type="time"
            value={formValues.delivery_time}
            onChange={(event) => updateValue('delivery_time', event.target.value)}
            className="field-input"
          />
        </Field>

        <Field label="Direccion o punto de entrega" className="md:col-span-2">
          <textarea
            rows="3"
            value={formValues.delivery_address}
            onChange={(event) => updateValue('delivery_address', event.target.value)}
            className="field-input"
            placeholder="Direccion, barrio o punto de encuentro"
          />
        </Field>
      </div>

      <section className="mt-6 rounded-[1.8rem] border border-dashed border-blush/55 bg-white/78 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-display text-2xl text-slate-700">Productos del pedido</h3>
            <p className="mt-2 text-sm text-slate-500">
              Agrega productos del catalogo o registra un item manual con descripcion personalizada.
            </p>
          </div>
          <button type="button" onClick={handleAddItem} className="btn-secondary w-full md:w-auto">
            Agregar item
          </button>
        </div>

        {!formValues.items.length ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-mist/55 bg-petal/60 px-5 py-6 text-sm text-slate-500">
            Aun no hay items agregados. Puedes dejar el pedido manual o sumar productos cuando lo necesites.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {formValues.items.map((item, index) => {
              const selectedProduct = products.find((product) => product.id === item.product_id)
              const subtotal = Number(item.unit_price || 0) * Number(item.quantity || 0)

              return (
                <div
                  key={item.id || `${item.product_id}-${index}`}
                  className="rounded-[1.6rem] border border-dashed border-mist/55 bg-cream/55 p-5"
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Producto">
                      <select
                        value={item.product_id}
                        onChange={(event) => handleItemChange(index, 'product_id', event.target.value)}
                        className="field-input"
                      >
                        <option value="">Item manual sin producto</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Cantidad">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                        className="field-input"
                      />
                    </Field>

                    <Field label="Precio unitario">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.unit_price}
                        onChange={(event) => handleItemChange(index, 'unit_price', event.target.value)}
                        className="field-input"
                        placeholder={selectedProduct ? String(selectedProduct.price ?? 0) : '15000'}
                      />
                    </Field>

                    <div className="rounded-[1.4rem] border border-dashed border-sage/65 bg-white/82 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Subtotal</p>
                      <p className="mt-3 text-xl font-semibold text-slate-700">
                        {formatCurrency(subtotal)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                    <Field label="Descripcion personalizada">
                      <input
                        value={item.custom_description}
                        onChange={(event) =>
                          handleItemChange(index, 'custom_description', event.target.value)
                        }
                        className="field-input"
                        placeholder="Ej: Bouquet personalizado color crema"
                      />
                    </Field>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="btn-danger w-full md:w-auto"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {fieldErrors.items ? <p className="field-error mt-3">{fieldErrors.items}</p> : null}
      </section>

      <div className="mt-6 space-y-5">
        <section className="rounded-[1.8rem] border border-dashed border-mist/55 bg-white/78 p-6 md:p-7">
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-2xl text-slate-700">Pago informativo</h3>
            <p className="text-sm text-slate-500">
              Este modulo solo organiza el pedido. No crea movimientos financieros todavia.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SummaryBlock label="Total calculado" value={formatCurrency(totalAmount)} />
            <SummaryBlock label="Saldo pendiente" value={formatCurrency(remainingAmount)} />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Abono / pagado" error={fieldErrors.paid_amount}>
              <input
                type="number"
                min="0"
                step="1"
                value={formValues.paid_amount}
                onChange={(event) => updateValue('paid_amount', event.target.value)}
                className={getFieldInputClassName(fieldErrors.paid_amount)}
                placeholder="0"
              />
            </Field>

            <Field label="Estado de pago">
              <select
                value={formValues.payment_status}
                onChange={(event) => handlePaymentStatusChange(event.target.value)}
                className="field-input"
              >
                {paymentStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-dashed border-sage/55 bg-white/78 p-6 md:p-7">
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-2xl text-slate-700">Estado del pedido</h3>
            <p className="text-sm text-slate-500">
              Define en que punto va la preparacion o entrega del pedido.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Estado del pedido">
              <select
                value={formValues.status}
                onChange={(event) => updateValue('status', event.target.value)}
                className="field-input w-full"
              >
                {orderStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <SummaryBlock
              label="Estado de pago actual"
              value={
                paymentStatusOptions.find((option) => option.value === formValues.payment_status)
                  ?.label || 'Pendiente'
              }
            />
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-dashed border-blush/55 bg-white/78 p-6 md:p-7">
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-2xl text-slate-700">Notas internas</h3>
            <p className="text-sm text-slate-500">
              Usa este espacio para registrar detalles de coordinacion, empaque o seguimiento.
            </p>
          </div>

          <Field label="Notas internas" className="mt-5">
            <textarea
              rows="6"
              value={formValues.notes}
              onChange={(event) => updateValue('notes', event.target.value)}
              className="field-input min-h-[160px]"
              placeholder="Notas internas del pedido, detalles de entrega o seguimiento"
            />
          </Field>
        </section>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? saveLabel || 'Guardando...' : 'Guardar pedido'}
        </button>
        {selectedOrder ? (
          <button type="button" onClick={onCancelEdit} className="btn-secondary">
            Cancelar edicion
          </button>
        ) : null}
      </div>
    </form>
  )
}

function Field({ label, children, className = '', error = '', required = false }) {
  return (
    <div className={className}>
      <label className="field-label">
        {label}
        {required ? <span className="ml-1 text-rose-700">*</span> : null}
      </label>
      {children}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}

function SummaryBlock({ label, value }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-mist/55 bg-white/82 p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 text-xl font-semibold leading-tight text-slate-700">{value}</p>
    </div>
  )
}

function getFieldInputClassName(hasError) {
  return `field-input ${hasError ? 'field-input-error' : ''}`.trim()
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeDraftItems(items) {
  return (items ?? []).map((item) => ({
    ...item,
    product_id: item.product_id || '',
    product_name: String(item.product_name || '').trim(),
    quantity: item.quantity === '' ? '' : Math.max(1, Math.floor(Number(item.quantity) || 1)),
    unit_price: item.unit_price === '' ? '' : Number(item.unit_price || 0),
    custom_description: String(item.custom_description || '').trim(),
  }))
}

function buildInitialItems(order) {
  return (order.items ?? []).map((item) => ({
    id: item.id,
    product_id: item.product_id || '',
    product_name: item.product_name || '',
    unit_price: Number(item.unit_price || 0),
    quantity: Number(item.quantity || 1),
    custom_description: item.custom_description || '',
  }))
}

function derivePaymentStatus(totalAmount, paidAmount, currentStatus) {
  if (paidAmount <= 0 || totalAmount <= 0) {
    return 'pending'
  }

  if (paidAmount >= totalAmount) {
    return 'paid'
  }

  return currentStatus === 'pending' ? 'partial' : currentStatus || 'partial'
}
