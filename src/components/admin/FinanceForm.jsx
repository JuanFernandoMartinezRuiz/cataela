import { useEffect, useMemo, useState } from 'react'
import FinanceCategoryModal from './FinanceCategoryModal'
import StatusBadge from '../common/StatusBadge'
import { useToast } from '../../providers/ToastProvider'
import { derivePaymentSummary } from '../../services/financeService'
import { formatCurrency } from '../../utils/formatters'

const PAYMENT_METHOD_OPTIONS = ['Nequi', 'Efectivo', 'Daviplata', 'Transferencia', 'Otro']

const initialState = {
  type: 'income',
  amount: '',
  product_id: '',
  quantity: 1,
  description: '',
  category: '',
  transaction_date: '',
  payments: [],
}

const emptyPayment = () => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  payment_method: '',
  payment_method_other: '',
  amount: '',
  payment_date: getTodayDate(),
  note: '',
})

export default function FinanceForm({
  financeCategories,
  products = [],
  selectedTransaction,
  saving,
  saveLabel,
  savingCategory,
  onSubmit,
  onCancelEdit,
  onCreateCategory,
}) {
  const { showToast } = useToast()
  const [formValues, setFormValues] = useState(initialState)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isDescriptionEdited, setIsDescriptionEdited] = useState(false)

  useEffect(() => {
    if (!selectedTransaction) {
      setFormValues({
        ...initialState,
        transaction_date: getTodayDate(),
      })
      setError('')
      setFieldErrors({})
      setIsDescriptionEdited(false)
      return
    }

    setFormValues({
      type: selectedTransaction.type,
      amount: selectedTransaction.amount ?? '',
      product_id: selectedTransaction.product_id || '',
      quantity: Number(selectedTransaction.quantity || 1),
      description: selectedTransaction.description || '',
      category: selectedTransaction.category || '',
      transaction_date: selectedTransaction.transaction_date || getTodayDate(),
      payments: buildInitialPayments(selectedTransaction),
    })
    setError('')
    setFieldErrors({})
    setIsDescriptionEdited(false)
  }, [selectedTransaction])

  const filteredCategories = useMemo(
    () => financeCategories.filter((category) => category.type === formValues.type),
    [financeCategories, formValues.type],
  )

  const isProductFieldVisible =
    formValues.type === 'income' && formValues.category === 'Ventas'
  const shouldShowQuantityField = isProductFieldVisible && Boolean(formValues.product_id)

  const normalizedPayments = useMemo(
    () => normalizeDraftPayments(formValues.payments),
    [formValues.payments],
  )

  const paymentSummary = useMemo(
    () => derivePaymentSummary(formValues.amount, normalizedPayments),
    [formValues.amount, normalizedPayments],
  )

  const paymentValidationMessage = useMemo(
    () => getPaymentValidationMessage(formValues.amount, normalizedPayments),
    [formValues.amount, normalizedPayments],
  )

  useEffect(() => {
    if (!formValues.category) {
      return
    }

    const categoryStillAvailable = filteredCategories.some(
      (category) => category.name === formValues.category,
    )

    if (!categoryStillAvailable) {
      setFormValues((current) => ({
        ...current,
        category: '',
        product_id: '',
        quantity: 1,
      }))
    }
  }, [filteredCategories, formValues.category])

  useEffect(() => {
    if (isProductFieldVisible || !formValues.product_id) {
      return
    }

    setFormValues((current) => ({
      ...current,
      product_id: '',
      quantity: 1,
    }))
  }, [isProductFieldVisible, formValues.product_id])

  const helperText = useMemo(() => {
    if (paymentSummary.status === 'pending') {
      return formValues.type === 'income'
        ? 'Este movimiento quedara pendiente por cobrar hasta registrar pagos.'
        : 'Este movimiento quedara pendiente por pagar hasta registrar pagos.'
    }

    if (paymentSummary.status === 'partial') {
      return formValues.type === 'income'
        ? 'Los pagos registrados cubren solo una parte del ingreso.'
        : 'Los pagos registrados cubren solo una parte del egreso.'
    }

    return 'El movimiento quedara marcado como completado con los pagos actuales.'
  }, [paymentSummary.status, formValues.type])

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

  function handleTypeChange(nextType) {
    setFormValues((current) => ({
      ...current,
      type: nextType,
      category: '',
      product_id: '',
      quantity: 1,
    }))
    setFieldErrors((current) => {
      const nextErrors = { ...current }
      delete nextErrors.category
      delete nextErrors.product_id
      delete nextErrors.payments
      return nextErrors
    })
  }

  function handleCategoryChange(nextCategory) {
    setFormValues((current) => ({
      ...current,
      category: nextCategory,
      product_id: nextCategory === 'Ventas' && current.type === 'income' ? current.product_id : '',
      quantity:
        nextCategory === 'Ventas' && current.type === 'income' && current.product_id
          ? current.quantity
          : 1,
    }))
    clearFieldError('category')
  }

  function handleProductChange(productId) {
    const selectedProduct = products.find((product) => product.id === productId)

    setFormValues((current) => {
      if (!selectedProduct) {
        return {
          ...current,
          product_id: '',
          quantity: 1,
        }
      }

      const quantity = Number(current.quantity || 1)
      const nextDescription = isDescriptionEdited
        ? current.description
        : buildSuggestedDescription(selectedProduct.name, quantity)

      return {
        ...current,
        product_id: selectedProduct.id,
        description: nextDescription,
        quantity,
        amount: String(Number(selectedProduct.price || 0) * quantity),
      }
    })

    setFieldErrors((current) => {
      const nextErrors = { ...current }
      delete nextErrors.product_id
      delete nextErrors.amount
      delete nextErrors.description
      delete nextErrors.quantity
      return nextErrors
    })
  }

  function handleQuantityChange(value) {
    const nextQuantity = value === '' ? '' : Math.max(1, Math.floor(Number(value) || 1))
    const selectedProduct = products.find((product) => product.id === formValues.product_id)

    setFormValues((current) => ({
      ...current,
      quantity: nextQuantity,
      amount: selectedProduct
        ? String(Number(selectedProduct.price || 0) * Number(nextQuantity || 1))
        : current.amount,
      description:
        selectedProduct && !isDescriptionEdited
          ? buildSuggestedDescription(selectedProduct.name, Number(nextQuantity || 1))
          : current.description,
    }))

    clearFieldError('quantity')
    clearFieldError('amount')
  }

  function handlePaymentChange(index, field, value) {
    if (field === 'amount') {
      const maxAllowed = getMaxAllowedForPayment(formValues.amount, formValues.payments, index)
      const numericValue = value === '' ? '' : Number(value)

      if (numericValue !== '' && numericValue > maxAllowed) {
        setFieldErrors((current) => ({
          ...current,
          payments: 'El pago supera el saldo pendiente.',
        }))
        setError('El pago supera el saldo pendiente.')
        return
      }
    }

    setFormValues((current) => ({
      ...current,
      payments: current.payments.map((payment, paymentIndex) =>
        paymentIndex === index
          ? {
              ...payment,
              [field]: value,
              ...(field === 'payment_method' && value !== 'Otro'
                ? { payment_method_other: '' }
                : {}),
            }
          : payment,
      ),
    }))

    setError('')
    clearFieldError('payments')
  }

  function handleAddPayment() {
    setFormValues((current) => ({
      ...current,
      payments: [...current.payments, emptyPayment()],
    }))
    setError('')
    clearFieldError('payments')
  }

  function handleRemovePayment(index) {
    setFormValues((current) => ({
      ...current,
      payments: current.payments.filter((_, paymentIndex) => paymentIndex !== index),
    }))
    setError('')
    clearFieldError('payments')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const nextFieldErrors = {}

    if (!formValues.description.trim()) {
      nextFieldErrors.description = 'Este campo es obligatorio.'
    }

    if (!formValues.amount) {
      nextFieldErrors.amount = 'Este campo es obligatorio.'
    }

    if (!formValues.transaction_date) {
      nextFieldErrors.transaction_date = 'Este campo es obligatorio.'
    }

    if (!formValues.category) {
      nextFieldErrors.category = 'Este campo es obligatorio.'
    }

    if (shouldShowQuantityField && (!formValues.quantity || Number(formValues.quantity) < 1)) {
      nextFieldErrors.quantity = 'La cantidad debe ser al menos 1.'
    }

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors)
      setError('Revisa los campos.')
      showToast({
        title: 'Revisa los campos',
        description: 'Completa la informacion obligatoria del movimiento.',
        tone: 'error',
      })
      return
    }

    const amount = Number(formValues.amount)

    if (amount <= 0) {
      setFieldErrors({ amount: 'El monto debe ser mayor que cero.' })
      setError('El monto debe ser mayor que cero.')
      showToast({
        title: 'Revisa los campos',
        description: 'El monto debe ser mayor que cero.',
        tone: 'error',
      })
      return
    }

    const cleanPayments = normalizedPayments.filter(
      (payment) =>
        payment.payment_method ||
        payment.amount !== '' ||
        payment.payment_date ||
        payment.note,
    )

    for (const payment of cleanPayments) {
      if (!payment.payment_method) {
        setFieldErrors({ payments: 'Cada pago debe tener metodo de pago.' })
        setError('Cada pago debe tener metodo de pago.')
        return
      }

      if (!payment.payment_date) {
        setFieldErrors({ payments: 'Cada pago debe tener fecha.' })
        setError('Cada pago debe tener fecha.')
        return
      }

      if (payment.amount === '' || Number(payment.amount) <= 0) {
        setFieldErrors({ payments: 'Cada pago debe tener un monto mayor que cero.' })
        setError('Cada pago debe tener un monto mayor que cero.')
        return
      }
    }

    if (paymentValidationMessage) {
      setFieldErrors({ payments: paymentValidationMessage })
      setError(paymentValidationMessage)
      showToast({
        title: 'Revisa los pagos',
        description: paymentValidationMessage,
        tone: 'error',
      })
      return
    }

    const summary = derivePaymentSummary(amount, cleanPayments)

    if (summary.paidAmount > amount) {
      setFieldErrors({ payments: 'La suma de pagos no puede superar el total.' })
      setError('La suma de pagos no puede superar el total.')
      showToast({
        title: 'Revisa los pagos',
        description: 'La suma de pagos no puede superar el valor total del movimiento.',
        tone: 'error',
      })
      return
    }

    setFieldErrors({})

    try {
      await onSubmit({
        ...formValues,
        amount,
        paid_amount: summary.paidAmount,
        status: summary.status,
        product_id: isProductFieldVisible ? formValues.product_id || null : null,
        quantity: shouldShowQuantityField ? Number(formValues.quantity || 1) : null,
        description: formValues.description.trim(),
        category: formValues.category.trim(),
        payment_method: summary.methodsLabel,
        payments: cleanPayments,
      })
    } catch (submitError) {
      setError(submitError.message || 'No fue posible guardar el movimiento.')
    }
  }

  async function handleCreateCategory(payload) {
    return onCreateCategory(payload)
  }

  const progressPercentage = getProgressPercentage(formValues.amount, paymentSummary.paidAmount)

  return (
    <>
      <form onSubmit={handleSubmit} className="admin-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-slate-700">
              {selectedTransaction ? 'Editar movimiento' : 'Nuevo movimiento'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Registra ingresos y egresos con multiples pagos, saldos pendientes y ventas
              asociadas al catalogo.
            </p>
          </div>
          {selectedTransaction ? (
            <button type="button" onClick={onCancelEdit} className="btn-secondary">
              Nuevo
            </button>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Tipo">
            <select
              value={formValues.type}
              onChange={(event) => handleTypeChange(event.target.value)}
              className="field-input"
            >
              <option value="income">Ingreso</option>
              <option value="expense">Egreso</option>
            </select>
          </Field>

          <Field label="Monto (COP)" error={fieldErrors.amount} required>
            <input
              type="number"
              min="0"
              step="1"
              value={formValues.amount}
              onChange={(event) => updateValue('amount', event.target.value)}
              className={getFieldInputClassName(fieldErrors.amount)}
              placeholder="25000"
            />
          </Field>

          <Field label="Categoria" error={fieldErrors.category} required>
            <div className="flex flex-col gap-3">
              <select
                value={formValues.category}
                onChange={(event) => handleCategoryChange(event.target.value)}
                className={getFieldInputClassName(fieldErrors.category)}
              >
                <option value="">Selecciona una categoria</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="btn-secondary self-start"
              >
                Nueva categoria
              </button>
            </div>
          </Field>

          <Field label="Fecha" error={fieldErrors.transaction_date} required>
            <input
              type="date"
              value={formValues.transaction_date}
              onChange={(event) => updateValue('transaction_date', event.target.value)}
              className={getFieldInputClassName(fieldErrors.transaction_date)}
            />
          </Field>

          {isProductFieldVisible ? (
            <Field label="Producto vendido">
              <select
                value={formValues.product_id}
                onChange={(event) => handleProductChange(event.target.value)}
                className="field-input"
              >
                <option value="">Venta manual sin producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {shouldShowQuantityField ? (
            <Field label="Cantidad" error={fieldErrors.quantity} required>
              <input
                type="number"
                min="1"
                step="1"
                value={formValues.quantity}
                onChange={(event) => handleQuantityChange(event.target.value)}
                className={getFieldInputClassName(fieldErrors.quantity)}
                placeholder="1"
              />
            </Field>
          ) : null}
        </div>

        <Field label="Descripcion" className="mt-4" error={fieldErrors.description} required>
          <textarea
            rows="4"
            value={formValues.description}
            onChange={(event) => {
              setIsDescriptionEdited(true)
              updateValue('description', event.target.value)
            }}
            className={getFieldInputClassName(fieldErrors.description)}
            placeholder="Describe el movimiento"
          />
        </Field>

        <section className="mt-8 rounded-[1.9rem] border border-dashed border-mist/60 bg-white/80 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="font-display text-2xl text-slate-700">Pagos asociados</h3>
              <p className="mt-2 text-sm text-slate-500">
                El estado se calcula automaticamente segun los pagos registrados.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddPayment}
              className="btn-secondary w-full md:w-auto"
            >
              Agregar pago
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PaymentSummaryCard
              className="sm:col-span-2"
              label="Estado calculado"
              value={
                <StatusBadge tone={paymentSummary.status}>
                  {translateStatus(paymentSummary.status)}
                </StatusBadge>
              }
            />
            <PaymentSummaryCard
              label="Total"
              value={formatCurrency(Number(formValues.amount || 0))}
            />
            <PaymentSummaryCard label="Pagado" value={formatCurrency(paymentSummary.paidAmount)} />
            <PaymentSummaryCard
              className="sm:col-span-2"
              label="Restante"
              value={formatCurrency(paymentSummary.remainingAmount)}
            />
          </div>

          {paymentSummary.status === 'partial' ? (
            <div className="mt-6 rounded-[1.6rem] border border-dashed border-sun/65 bg-sun/10 p-5">
              <div className="h-3 overflow-hidden rounded-full bg-mist/15">
                <div
                  className="h-full rounded-full bg-sun transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>
                  Pagado: {formatCurrency(paymentSummary.paidAmount)} /{' '}
                  {formatCurrency(Number(formValues.amount || 0))}
                </p>
                <p>Restante: {formatCurrency(paymentSummary.remainingAmount)}</p>
              </div>
            </div>
          ) : null}

          {!formValues.payments.length ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-sand/55 bg-cream/55 px-6 py-8 text-center">
              <p className="text-sm text-slate-500">
                Aun no hay pagos registrados. El movimiento quedara pendiente hasta que agregues
                uno.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {formValues.payments.map((payment, index) => {
                const maxAllowed = getMaxAllowedForPayment(
                  formValues.amount,
                  formValues.payments,
                  index,
                )

                return (
                  <div
                    key={payment.id || `${payment.payment_method}-${index}`}
                    className="rounded-[1.7rem] border border-dashed border-sage/55 bg-cream/70 p-5 md:p-6"
                  >
                    <div className="grid grid-cols-1 gap-4">
                      <Field label="Metodo de pago" className="w-full min-w-0">
                        <div className="w-full min-w-0">
                          <select
                            value={payment.payment_method}
                            onChange={(event) =>
                              handlePaymentChange(index, 'payment_method', event.target.value)
                            }
                            className="field-input w-full min-w-0 overflow-hidden text-ellipsis"
                          >
                            <option value="">Selecciona un metodo</option>
                            {PAYMENT_METHOD_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </Field>

                      <Field label="Monto" className="w-full min-w-0">
                        <div className="w-full min-w-0">
                          <input
                            type="number"
                            min="0"
                            max={maxAllowed > 0 ? maxAllowed : undefined}
                            step="1"
                            value={payment.amount}
                            onChange={(event) =>
                              handlePaymentChange(index, 'amount', event.target.value)
                            }
                            className="field-input w-full min-w-0 overflow-hidden text-ellipsis"
                            placeholder="10000"
                          />
                        </div>
                      </Field>

                      <Field label="Fecha" className="w-full min-w-0">
                        <div className="w-full min-w-0">
                          <input
                            type="date"
                            value={payment.payment_date}
                            onChange={(event) =>
                              handlePaymentChange(index, 'payment_date', event.target.value)
                            }
                            className="field-input w-full min-w-0 overflow-hidden text-ellipsis"
                          />
                        </div>
                      </Field>

                      <Field label="Nota" className="w-full min-w-0">
                        <div className="w-full min-w-0">
                          <input
                            value={payment.note}
                            onChange={(event) =>
                              handlePaymentChange(index, 'note', event.target.value)
                            }
                            className="field-input w-full min-w-0 overflow-hidden text-ellipsis"
                            placeholder="Opcional"
                          />
                        </div>
                      </Field>

                      <div className="w-full min-w-0">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemovePayment(index)}
                            className="btn-danger w-full sm:w-auto"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </div>

                    {payment.payment_method === 'Otro' ? (
                      <div className="mt-4">
                        <Field label="Detalle del metodo" className="w-full min-w-0">
                          <div className="w-full min-w-0">
                            <input
                              value={payment.payment_method_other}
                              onChange={(event) =>
                                handlePaymentChange(
                                  index,
                                  'payment_method_other',
                                  event.target.value,
                                )
                              }
                              className="field-input w-full min-w-0 overflow-hidden text-ellipsis"
                              placeholder="Ej. enlace de pago, consignacion"
                            />
                          </div>
                        </Field>
                      </div>
                    ) : null}

                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">
                      Saldo maximo para este pago: {formatCurrency(maxAllowed)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {fieldErrors.payments ? <p className="field-error mt-3">{fieldErrors.payments}</p> : null}
        </section>

        {!filteredCategories.length ? (
          <p className="mt-3 text-sm text-amber-700">
            No hay categorias disponibles para este tipo. Crea una nueva para continuar.
          </p>
        ) : null}
        {helperText ? <p className="mt-3 text-sm text-amber-700">{helperText}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? saveLabel || 'Guardando movimiento...' : 'Guardar movimiento'}
          </button>
          {selectedTransaction ? (
            <button type="button" onClick={onCancelEdit} className="btn-secondary">
              Cancelar edicion
            </button>
          ) : null}
        </div>
      </form>

      <FinanceCategoryModal
        open={isCategoryModalOpen}
        defaultType={formValues.type}
        saving={savingCategory}
        onClose={() => setIsCategoryModalOpen(false)}
        onSubmit={handleCreateCategory}
        onCreated={(category) => handleCategoryChange(category.name)}
      />
    </>
  )
}

function PaymentSummaryCard({ label, value, className = '' }) {
  const isVisualElement = typeof value !== 'string' && typeof value !== 'number'

  return (
    <div
      className={`min-w-0 rounded-[1.5rem] border border-dashed border-sand/60 bg-white/85 p-4 shadow-[0_14px_30px_rgba(148,163,184,0.08)] ${className}`.trim()}
    >
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <div
        className={`mt-4 text-slate-700 ${
          isVisualElement
            ? 'flex min-h-[3.2rem] items-center justify-center'
            : 'text-xl font-semibold leading-tight'
        }`}
      >
        {value}
      </div>
    </div>
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

function getFieldInputClassName(hasError) {
  return `field-input ${hasError ? 'field-input-error' : ''}`.trim()
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function buildInitialPayments(transaction) {
  if (transaction.payments?.length) {
    return transaction.payments.map((payment) => mapPaymentToDraft(payment))
  }

  if (Number(transaction.paid_amount || 0) > 0) {
    return [
      mapPaymentToDraft({
        id: 'legacy-payment',
        payment_method: transaction.payment_method || '',
        amount: Number(transaction.paid_amount || 0),
        payment_date: transaction.transaction_date || getTodayDate(),
        note: 'Pago migrado desde un registro anterior.',
      }),
    ]
  }

  return []
}

function mapPaymentToDraft(payment) {
  const method = String(payment.payment_method || '').trim()
  const isKnownMethod = PAYMENT_METHOD_OPTIONS.includes(method) && method !== 'Otro'

  return {
    id: payment.id || `draft-${Date.now()}`,
    payment_method: isKnownMethod ? method : method ? 'Otro' : '',
    payment_method_other: isKnownMethod ? '' : method,
    amount: payment.amount ?? '',
    payment_date: payment.payment_date || getTodayDate(),
    note: payment.note || '',
  }
}

function normalizeDraftPayments(payments) {
  return (payments ?? []).map((payment) => ({
    ...payment,
    payment_method:
      payment.payment_method === 'Otro'
        ? String(payment.payment_method_other || '').trim() || 'Otro'
        : String(payment.payment_method || '').trim(),
    amount: payment.amount === '' ? '' : Number(payment.amount),
    payment_date: payment.payment_date,
    note: String(payment.note || '').trim(),
  }))
}

function getPaymentValidationMessage(totalAmount, payments) {
  const amount = Number(totalAmount || 0)

  if (amount <= 0) {
    return ''
  }

  let runningTotal = 0

  for (const payment of payments) {
    const paymentAmount = Number(payment.amount || 0)
    runningTotal += paymentAmount

    if (runningTotal > amount) {
      return 'El pago supera el saldo pendiente.'
    }
  }

  return ''
}

function getMaxAllowedForPayment(totalAmount, payments, currentIndex) {
  const amount = Number(totalAmount || 0)

  if (amount <= 0) {
    return 0
  }

  const otherPaymentsTotal = (payments ?? []).reduce((sum, payment, index) => {
    if (index === currentIndex) {
      return sum
    }

    return sum + Number(payment.amount || 0)
  }, 0)

  return Math.max(0, amount - otherPaymentsTotal)
}

function getProgressPercentage(totalAmount, paidAmount) {
  const amount = Number(totalAmount || 0)

  if (amount <= 0) {
    return 0
  }

  return Math.max(0, Math.min(100, (Number(paidAmount || 0) / amount) * 100))
}

function translateStatus(status) {
  if (status === 'completed') {
    return 'Completado'
  }

  if (status === 'partial') {
    return 'Parcialmente pagado'
  }

  return 'Pendiente'
}

function buildSuggestedDescription(productName, quantity) {
  return `Venta - ${productName} x ${quantity}`
}
