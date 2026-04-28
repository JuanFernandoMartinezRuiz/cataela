import { useEffect, useMemo, useState } from 'react'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from '../../services/categoryService'
import { slugify } from '../../utils/slugify'
import { formatDate } from '../../utils/formatters'

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editingName, setEditingName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      setLoading(true)
      setError('')
      const rows = await fetchCategories()
      setCategories(rows)
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar las categorias.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCategory(event) {
    event.preventDefault()

    if (!newName.trim()) {
      setError('El nombre de la categoria no puede estar vacio.')
      return
    }

    try {
      setSaving(true)
      setError('')
      const category = await createCategory({ name: newName })
      setCategories((current) => [...current, category].sort(sortByName))
      setNewName('')
    } catch (saveError) {
      setError(saveError.message || 'No fue posible crear la categoria.')
    } finally {
      setSaving(false)
    }
  }

  function startEditing(category) {
    setEditingId(category.id)
    setEditingName(category.name)
    setError('')
  }

  async function handleUpdateCategory(id) {
    if (!editingName.trim()) {
      setError('El nombre de la categoria no puede estar vacio.')
      return
    }

    try {
      setSaving(true)
      setError('')
      const updated = await updateCategory(id, { name: editingName })
      setCategories((current) =>
        current.map((category) => (category.id === id ? updated : category)).sort(sortByName),
      )
      setEditingId('')
      setEditingName('')
    } catch (saveError) {
      setError(saveError.message || 'No fue posible actualizar la categoria.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCategory(category) {
    const confirmed = window.confirm(`Eliminar la categoria "${category.name}"?`)
    if (!confirmed) {
      return
    }

    try {
      setSaving(true)
      setError('')
      await deleteCategory(category.id)
      setCategories((current) => current.filter((item) => item.id !== category.id))
    } catch (deleteError) {
      setError(deleteError.message || 'No fue posible eliminar la categoria.')
    } finally {
      setSaving(false)
    }
  }

  const newSlugPreview = useMemo(() => slugify(newName), [newName])

  return (
    <>
      <div className="admin-panel p-6 md:p-8">
        <PageHeading
          eyebrow="Categorias"
          title="Gestiona las categorias del catalogo"
          description="Crea, edita y elimina categorias para organizar mejor los productos de Cataela."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleCreateCategory} className="admin-panel p-6">
          <h2 className="font-display text-3xl text-slate-700">Nueva categoria</h2>
          <div className="mt-5">
            <label className="field-label">Nombre</label>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="field-input"
              placeholder="Ej. Velas de temporada"
            />
          </div>
          <div className="mt-4 rounded-[1.5rem] border border-dashed border-sand bg-petal/80 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Slug generado
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {newSlugPreview || 'Se genera automaticamente desde el nombre'}
            </p>
          </div>
          <button type="submit" disabled={saving} className="btn-primary mt-6">
            {saving ? 'Guardando...' : 'Crear categoria'}
          </button>
        </form>

        <div className="admin-panel p-6">
          <h2 className="font-display text-3xl text-slate-700">Listado</h2>
          <p className="mt-2 text-sm text-slate-500">
            Puedes editar el nombre y el slug se actualiza automaticamente.
          </p>

          {loading ? <LoadingState label="Cargando categorias..." /> : null}
          {!loading && error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
          {!loading ? (
            <div className="mt-5 space-y-4">
              {categories.map((category) => {
                const isEditing = editingId === category.id
                return (
                  <div
                    key={category.id}
                    className="rounded-[1.5rem] border border-dashed border-sand bg-white/80 p-4"
                  >
                    {isEditing ? (
                      <>
                        <label className="field-label">Nombre</label>
                        <input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          className="field-input"
                        />
                        <p className="mt-3 text-sm text-slate-500">
                          Slug: {slugify(editingName) || 'pendiente'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleUpdateCategory(category.id)}
                            disabled={saving}
                            className="btn-primary"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId('')
                              setEditingName('')
                            }}
                            className="btn-secondary"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold text-slate-700">{category.name}</p>
                          <p className="mt-1 text-sm text-slate-500">Slug: {category.slug}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                            Creada: {formatDate(category.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(category)}
                            className="btn-secondary"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(category)}
                            className="btn-ghost"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

function sortByName(left, right) {
  return left.name.localeCompare(right.name, 'es', { sensitivity: 'base' })
}
