import { useEffect, useMemo, useState } from 'react'
import FinanceCategoryModal from './FinanceCategoryModal'
import { useToast } from '../../providers/ToastProvider'

const initialState = {
  type: 'income',
  amount: '',
  paid_amount: '',
  description: '',
  category: '',
  payment_method: '',
  transaction_date: '',
  status: 'completed',
}

export default function FinanceForm({
  financeCategories,
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

  useEffect(() => {
    if (!selectedTransaction) {
      setFormValues({
        ...initialState,
        transaction_date: getTodayDate(),
      })
      setError('')
      setFieldErrors({})
      return
    }

    setFormValues({
      type: selectedTransaction.type,
      amount: selectedTransaction.amount,
      paid_amount:
        selectedTransaction.status === 'partial'
          ? selectedTransaction.paid_amount
          : '',
      description: selectedTransaction.description || '',
      category: selectedTransaction.category || '',
      payment_method: selectedTransaction.payment_method || '',
      transaction_date: selectedTransaction.transaction_date || getTodayDate(),
      status: selectedTransaction.status,
    })
    setError('')
    setFieldErrors({})
  }, [selectedTransaction])

  const helperText = useMemo(() => {
    if (formValues.status === 'pending') {
      return formValues.type === 'income'
        ? 'Este movimiento quedara pendiente por cobrar.'
        : 'Este movimiento quedara pendiente por pagar.'
    }

    if (formValues.status === 'partial') {
      return formValues.type === 'income'
        ? 'Registra cuanto ya se cobro para calcular el saldo pendiente.'
        : 'Registra cuanto ya se pago para calcular el saldo pendiente.'
    }

    return null
  }, [formValues.status, formValues.type])

  const filteredCategories = useMemo(
    () =>
      financeCategories.filter((category) => category.type === formValues.type),
    [financeCategories, formValues.type],
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
      }))
    }
  }, [filteredCategories, formValues.category])

  function updateValue(field, value) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))
    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      const nextErrors = { ...current }
      delete nextErrors[field]
      return nextErrors
    })
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

    setFieldErrors({})

    if (Number(formValues.amount) <= 0) {
      setFieldErrors({ amount: 'El monto debe ser mayor que cero.' })
      setError('El monto debe ser mayor que cero.')
      showToast({
        title: 'Revisa los campos',
        description: 'El monto debe ser mayor que cero.',
        tone: 'error',
      })
      return
    }

    const amount = Number(formValues.amount)
    let paidAmount = amount
    if (formValues.status === 'pending') {
      paidAmount = 0
    }

    if (formValues.status === 'partial') {
      if (formValues.paid_amount === '' || formValues.paid_amount === null) {
        setFieldErrors({ paid_amount: 'Este campo es obligatorio.' })
        setError('Ingresa el valor pagado para un movimiento parcial.')
        showToast({
          title: 'Revisa los campos',
          description: 'Ingresa el valor pagado para un movimiento parcial.',
          tone: 'error',
        })
        return
      }

      paidAmount = Number(formValues.paid_amount)

      if (paidAmount <= 0) {
        setFieldErrors({ paid_amount: 'Debe ser mayor que cero.' })
        setError('El valor pagado debe ser mayor que cero.')
        showToast({
          title: 'Revisa los campos',
          description: 'El valor pagado debe ser mayor que cero.',
          tone: 'error',
        })
        return
      }

      if (paidAmount > amount) {
        setFieldErrors({ paid_amount: 'No puede ser mayor que el total.' })
        setError('El valor pagado no puede ser mayor que el valor total.')
        showToast({
          title: 'Revisa los campos',
          description: 'El valor pagado no puede ser mayor que el total.',
          tone: 'error',
        })
        return
      }

      if (paidAmount >= amount) {
        setFieldErrors({ paid_amount: 'Debe ser menor que el total.' })
        setError('Para un movimiento parcial, el valor pagado debe ser menor que el total.')
        showToast({
          title: 'Revisa los campos',
          description: 'Para un movimiento parcial, el valor pagado debe ser menor que el total.',
          tone: 'error',
        })
        return
      }
    }

    try {
      await onSubmit({
        ...formValues,
        amount,
        paid_amount: paidAmount,
        description: formValues.description.trim(),
        category: formValues.category.trim(),
        payment_method: formValues.payment_method.trim(),
      })
    } catch (submitError) {
      setError(submitError.message || 'No fue posible guardar el movimiento.')
    }
  }

  async function handleCreateCategory(payload) {
    return onCreateCategory(payload)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="admin-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-slate-700">
              {selectedTransaction ? 'Editar movimiento' : 'Nuevo movimiento'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Registra ingresos, egresos o pendientes de cobro y pago.
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
              onChange={(event) => updateValue('type', event.target.value)}
              className="field-input"
            >
              <option value="income">Ingreso</option>
              <option value="expense">Egreso</option>
            </select>
          </Field>

          <Field label="Estado">
            <select
              value={formValues.status}
              onChange={(event) => updateValue('status', event.target.value)}
            className="field-input"
          >
            <option value="completed">Completado</option>
            <option value="pending">Pendiente</option>
            <option value="partial">Parcialmente pagado</option>
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

          <Field label="Fecha" error={fieldErrors.transaction_date} required>
            <input
              type="date"
              value={formValues.transaction_date}
              onChange={(event) => updateValue('transaction_date', event.target.value)}
              className={getFieldInputClassName(fieldErrors.transaction_date)}
            />
          </Field>

          {formValues.status === 'partial' ? (
            <Field label="Valor pagado" error={fieldErrors.paid_amount} required>
              <input
                type="number"
                min="0"
                step="1"
                value={formValues.paid_amount}
                onChange={(event) => updateValue('paid_amount', event.target.value)}
                className={getFieldInputClassName(fieldErrors.paid_amount)}
                placeholder="10000"
              />
            </Field>
          ) : null}

          <Field label="Categoria" error={fieldErrors.category} required>
            <div className="flex flex-col gap-3">
              <select
                value={formValues.category}
                onChange={(event) => updateValue('category', event.target.value)}
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

          <Field label="Metodo de pago">
            <input
              value={formValues.payment_method}
              onChange={(event) => updateValue('payment_method', event.target.value)}
              className="field-input"
              placeholder="Ej. Efectivo, Nequi, transferencia"
            />
          </Field>
        </div>

        <Field label="Descripcion" className="mt-4" error={fieldErrors.description} required>
          <textarea
            rows="4"
            value={formValues.description}
            onChange={(event) => updateValue('description', event.target.value)}
            className={getFieldInputClassName(fieldErrors.description)}
            placeholder="Describe el movimiento"
          />
        </Field>

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
        onCreated={(category) => updateValue('category', category.name)}
      />
    </>
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
