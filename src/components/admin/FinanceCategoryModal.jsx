import { useEffect, useState } from 'react'

export default function FinanceCategoryModal({
  open,
  defaultType,
  saving,
  onClose,
  onSubmit,
  onCreated,
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState(defaultType || 'income')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setType(defaultType || 'income')
    }
  }, [defaultType, open])

  if (!open) {
    return null
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('El nombre de la categoria es obligatorio.')
      return
    }

    try {
      const category = await onSubmit({
        name: name.trim(),
        type,
      })
      setName('')
      onCreated(category)
      onClose()
    } catch (submitError) {
      setError(submitError.message || 'No fue posible crear la categoria.')
    }
  }

  function handleClose() {
    setName('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm">
      <div className="card-soft w-full max-w-lg p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-mist">
              Finanzas
            </p>
            <h2 className="mt-2 font-display text-4xl text-slate-700">
              Nueva categoria
            </h2>
          </div>
          <button type="button" onClick={handleClose} className="btn-ghost">
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="field-label">Nombre</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field-input"
              placeholder="Ej. Ferias, empaques, publicidad"
              autoFocus
            />
          </div>

          <div>
            <label className="field-label">Tipo</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="field-input"
            >
              <option value="income">Ingreso</option>
              <option value="expense">Egreso</option>
            </select>
          </div>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar categoria'}
            </button>
            <button type="button" onClick={handleClose} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
