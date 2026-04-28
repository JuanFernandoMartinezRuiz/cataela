import { useEffect, useMemo, useState } from 'react'
import FinanceCategoryModal from './FinanceCategoryModal'

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
  const [formValues, setFormValues] = useState(initialState)
  const [error, setError] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)

  useEffect(() => {
    if (!selectedTransaction) {
      setFormValues({
        ...initialState,
        transaction_date: getTodayDate(),
      })
      setError('')
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
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (
      !formValues.description.trim() ||
      !formValues.amount ||
      !formValues.transaction_date ||
      !formValues.category
    ) {
      setError('Completa descripcion, monto, categoria y fecha.')
      return
    }

    if (Number(formValues.amount) <= 0) {
      setError('El monto debe ser mayor que cero.')
      return
    }

    const amount = Number(formValues.amount)
    let paidAmount = amount
    if (formValues.status === 'pending') {
      paidAmount = 0
    }

    if (formValues.status === 'partial') {
      if (formValues.paid_amount === '' || formValues.paid_amount === null) {
        setError('Ingresa el valor pagado para un movimiento parcial.')
        return
      }

      paidAmount = Number(formValues.paid_amount)

      if (paidAmount < 0) {
        setError('El valor pagado no puede ser negativo.')
        return
      }

      if (paidAmount > amount) {
        setError('El valor pagado no puede ser mayor que el valor total.')
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

          <Field label="Monto (COP)">
            <input
              type="number"
              min="0"
              step="1"
              value={formValues.amount}
              onChange={(event) => updateValue('amount', event.target.value)}
              className="field-input"
              placeholder="25000"
            />
          </Field>

          <Field label="Fecha">
            <input
              type="date"
              value={formValues.transaction_date}
              onChange={(event) => updateValue('transaction_date', event.target.value)}
              className="field-input"
            />
          </Field>

          {formValues.status === 'partial' ? (
            <Field label="Valor pagado">
              <input
                type="number"
                min="0"
                step="1"
                value={formValues.paid_amount}
                onChange={(event) => updateValue('paid_amount', event.target.value)}
                className="field-input"
                placeholder="10000"
              />
            </Field>
          ) : null}

          <Field label="Categoria">
            <div className="flex flex-col gap-3">
              <select
                value={formValues.category}
                onChange={(event) => updateValue('category', event.target.value)}
                className="field-input"
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

        <Field label="Descripcion" className="mt-4">
          <textarea
            rows="4"
            value={formValues.description}
            onChange={(event) => updateValue('description', event.target.value)}
            className="field-input"
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
          <button type="submit" disabled={saving} className="btn-primary">
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

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}
