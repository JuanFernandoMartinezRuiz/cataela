import { useEffect, useState } from 'react'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import StatusBadge from '../../components/common/StatusBadge'
import { useToast } from '../../providers/ToastProvider'
import {
  createEssence,
  deleteEssence,
  fetchAdminEssences,
  updateEssence,
} from '../../services/essenceService'
import { formatDate } from '../../utils/formatters'

const emptyForm = {
  name: '',
  description: '',
  is_available: true,
  notes: '',
}

export default function AdminEssencesPage() {
  const { showToast } = useToast()
  const [essences, setEssences] = useState([])
  const [formValues, setFormValues] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    loadEssences()
  }, [])

  async function loadEssences() {
    try {
      setLoading(true)
      setError('')
      const rows = await fetchAdminEssences()
      setEssences(rows)
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar las esencias.')
    } finally {
      setLoading(false)
    }
  }

  function updateForm(field, value) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
  }

  function startEditing(essence) {
    setEditingId(essence.id)
    setFormValues({
      name: essence.name || '',
      description: essence.description || '',
      is_available: Boolean(essence.is_available),
      notes: essence.notes || '',
    })
    setFieldErrors({})
    setError('')
  }

  function resetForm() {
    setEditingId('')
    setFormValues(emptyForm)
    setFieldErrors({})
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!formValues.name.trim()) {
      setFieldErrors({ name: 'Este campo es obligatorio.' })
      setError('El nombre de la esencia no puede estar vacio.')
      showToast({
        title: 'Revisa los campos',
        description: 'El nombre de la esencia es obligatorio.',
        tone: 'error',
      })
      return
    }

    try {
      setSaving(true)
      setError('')
      setFieldErrors({})

      if (editingId) {
        const updated = await updateEssence(editingId, formValues)
        setEssences((current) =>
          current.map((essence) => (essence.id === editingId ? updated : essence)).sort(sortByName),
        )
        showToast({
          title: 'Elemento guardado',
          description: 'La esencia se actualizo correctamente.',
          tone: 'success',
        })
      } else {
        const created = await createEssence(formValues)
        setEssences((current) => [...current, created].sort(sortByName))
        showToast({
          title: 'Elemento guardado',
          description: 'La esencia se creo correctamente.',
          tone: 'success',
        })
      }

      resetForm()
    } catch (saveError) {
      setError(saveError.message || 'No fue posible guardar la esencia.')
      showToast({
        title: 'Error al guardar',
        description: saveError.message || 'No fue posible guardar la esencia.',
        tone: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(essence) {
    const confirmed = window.confirm('¿Seguro que deseas eliminar este elemento?')
    if (!confirmed) {
      return
    }

    try {
      setDeletingId(essence.id)
      setError('')
      await deleteEssence(essence.id)
      setEssences((current) => current.filter((item) => item.id !== essence.id))
      if (editingId === essence.id) {
        resetForm()
      }
      showToast({
        title: 'Elemento eliminado',
        description: 'La esencia se elimino correctamente.',
        tone: 'success',
      })
    } catch (deleteError) {
      setError(deleteError.message || 'No fue posible eliminar la esencia.')
      showToast({
        title: 'Error al eliminar',
        description: deleteError.message || 'No fue posible eliminar la esencia.',
        tone: 'error',
      })
    } finally {
      setDeletingId('')
    }
  }

  return (
    <>
      <div className="admin-panel p-6 md:p-8">
        <PageHeading
          eyebrow="Esencias"
          title="Gestiona los aromas disponibles"
          description="Activa o desactiva esencias para mostrarlas en la web publica, pedidos y ventas sin tocar codigo."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleSubmit} className="admin-panel p-6">
          <h2 className="font-display text-3xl text-slate-700">
            {editingId ? 'Editar esencia' : 'Nueva esencia'}
          </h2>

          <div className="mt-5 space-y-4">
            <Field label="Nombre" error={fieldErrors.name} required>
              <input
                value={formValues.name}
                onChange={(event) => updateForm('name', event.target.value)}
                className={`field-input ${fieldErrors.name ? 'field-input-error' : ''}`}
                placeholder="Ej. Vainilla cremosa"
              />
            </Field>

            <Field label="Descripcion">
              <textarea
                rows="3"
                value={formValues.description}
                onChange={(event) => updateForm('description', event.target.value)}
                className="field-input"
                placeholder="Describe notas aromaticas, intensidad o sensacion"
              />
            </Field>

            <label className="flex items-center gap-3 rounded-[1.4rem] border border-dashed border-mist/55 bg-white/82 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formValues.is_available}
                onChange={(event) => updateForm('is_available', event.target.checked)}
                className="h-4 w-4 accent-[#8ea2b4]"
              />
              Disponible para mostrar y seleccionar
            </label>

            <Field label="Notas internas">
              <textarea
                rows="4"
                value={formValues.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                className="field-input"
                placeholder="Notas internas sobre temporada, pruebas o stock"
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : editingId ? 'Actualizar esencia' : 'Crear esencia'}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancelar
              </button>
            ) : null}
          </div>
        </form>

        <div className="admin-panel p-6">
          <h2 className="font-display text-3xl text-slate-700">Listado</h2>
          <p className="mt-2 text-sm text-slate-500">
            Aqui controlas que aromas aparecen disponibles para ventas, pedidos y la web.
          </p>

          {loading ? <LoadingState label="Cargando esencias..." /> : null}
          {!loading && error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
          {!loading ? (
            <div className="mt-5 space-y-4">
              {essences.map((essence) => (
                <div
                  key={essence.id}
                  className="rounded-[1.5rem] border border-dashed border-mist/55 bg-white/80 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-700">{essence.name}</p>
                        <StatusBadge tone={essence.is_available ? 'active' : 'inactive'}>
                          {essence.is_available ? 'Disponible' : 'Inactiva'}
                        </StatusBadge>
                      </div>
                      {essence.description ? (
                        <p className="mt-2 text-sm text-slate-500">{essence.description}</p>
                      ) : null}
                      {essence.notes ? (
                        <p className="mt-2 text-xs italic text-slate-400">{essence.notes}</p>
                      ) : null}
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                        Creada: {formatDate(essence.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(essence)}
                        className="btn-secondary"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(essence)}
                        disabled={deletingId === essence.id}
                        className="btn-danger disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {deletingId === essence.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

function Field({ label, children, error = '', required = false }) {
  return (
    <div>
      <label className="field-label">
        {label}
        {required ? <span className="ml-1 text-rose-700">*</span> : null}
      </label>
      {children}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}

function sortByName(left, right) {
  return left.name.localeCompare(right.name, 'es', { sensitivity: 'base' })
}
