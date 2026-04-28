import { useMemo, useState } from 'react'
import { slugify } from '../../utils/slugify'

export default function CategoryModal({
  open,
  saving,
  onClose,
  onCreateCategory,
  onCreated,
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const slugPreview = useMemo(() => slugify(name), [name])

  if (!open) {
    return null
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('El nombre de la categoria no puede estar vacio.')
      return
    }

    setError('')

    try {
      const category = await onCreateCategory(trimmedName)
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
              Nueva categoria
            </p>
            <h2 className="mt-2 font-display text-4xl text-slate-700">
              Crear categoria
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
              placeholder="Ej. Velas botanicas"
              autoFocus
            />
          </div>

          <div className="rounded-[1.5rem] border border-dashed border-sand bg-petal/80 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Slug generado
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {slugPreview || 'Se generara automaticamente al escribir el nombre'}
            </p>
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
