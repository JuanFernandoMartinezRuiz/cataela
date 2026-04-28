import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CategoryModal from './CategoryModal'
import ImagePlaceholder from '../common/ImagePlaceholder'
import { useToast } from '../../providers/ToastProvider'

const initialState = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  isActive: true,
}

export default function ProductForm({
  categories,
  initialValues,
  existingGallery,
  loading,
  saving,
  saveLabel,
  warning,
  onSubmit,
  onDeleteImage,
  onCreateCategory,
}) {
  const { showToast } = useToast()
  const [formValues, setFormValues] = useState(initialState)
  const [fieldErrors, setFieldErrors] = useState({})
  const [mainImageFile, setMainImageFile] = useState(null)
  const [mainPreview, setMainPreview] = useState('')
  const [galleryFiles, setGalleryFiles] = useState([])
  const [galleryPreviews, setGalleryPreviews] = useState([])
  const [error, setError] = useState('')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)

  useEffect(() => {
    if (!initialValues) {
      return
    }

    setFormValues({
      name: initialValues.name || '',
      description: initialValues.description || '',
      price: initialValues.price || '',
      categoryId: initialValues.category_id || '',
      isActive: Boolean(initialValues.is_active),
    })
    setMainPreview(initialValues.main_image_url || '')
    setFieldErrors({})
  }, [initialValues])

  useEffect(() => {
    return () => {
      galleryPreviews.forEach((preview) => URL.revokeObjectURL(preview))
    }
  }, [galleryPreviews])

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

  function handleMainImageChange(event) {
    const nextFile = event.target.files?.[0]
    setMainImageFile(nextFile || null)

    if (nextFile) {
      setMainPreview(URL.createObjectURL(nextFile))
    }
  }

  function handleGalleryChange(event) {
    const nextFiles = Array.from(event.target.files || [])
    galleryPreviews.forEach((preview) => URL.revokeObjectURL(preview))
    setGalleryFiles(nextFiles)
    setGalleryPreviews(nextFiles.map((file) => URL.createObjectURL(file)))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const nextFieldErrors = {}

    if (!formValues.name.trim()) {
      nextFieldErrors.name = 'Este campo es obligatorio.'
    }

    if (!formValues.categoryId) {
      nextFieldErrors.categoryId = 'Este campo es obligatorio.'
    }

    if (!formValues.price) {
      nextFieldErrors.price = 'Este campo es obligatorio.'
    }

    if (!formValues.description.trim()) {
      nextFieldErrors.description = 'Este campo es obligatorio.'
    }

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors)
      setError('Revisa los campos.')
      showToast({
        title: 'Revisa los campos',
        description: 'Completa la informacion obligatoria del producto.',
        tone: 'error',
      })
      return
    }

    setFieldErrors({})

    try {
      await onSubmit({
        values: formValues,
        mainImageFile,
        galleryFiles,
      })
    } catch (submitError) {
      setError(submitError.message || 'No fue posible guardar el producto.')
    }
  }

  async function handleCreateCategory(name) {
    setSavingCategory(true)

    try {
      return await onCreateCategory(name)
    } finally {
      setSavingCategory(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="admin-panel p-6">
          <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nombre" error={fieldErrors.name} required>
            <input
              value={formValues.name}
              onChange={(event) => updateValue('name', event.target.value)}
              className={getFieldInputClassName(fieldErrors.name)}
              placeholder="Ej. Vela Mini Ramo"
            />
          </Field>

            <Field label="Categoria" error={fieldErrors.categoryId} required>
              <div className="flex flex-col gap-3">
                <select
                  value={formValues.categoryId}
                  onChange={(event) => updateValue('categoryId', event.target.value)}
                  className={getFieldInputClassName(fieldErrors.categoryId)}
                >
                  <option value="">Selecciona una categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
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

            <Field label="Precio (COP)" error={fieldErrors.price} required>
              <input
                type="number"
                min="0"
                value={formValues.price}
                onChange={(event) => updateValue('price', event.target.value)}
                className={getFieldInputClassName(fieldErrors.price)}
                placeholder="20000"
              />
            </Field>

            <Field label="Estado">
              <label className="flex h-full items-center gap-3 rounded-2xl border border-sand/60 bg-white/85 px-4 py-3">
                <input
                  type="checkbox"
                  checked={formValues.isActive}
                  onChange={(event) => updateValue('isActive', event.target.checked)}
                />
                <span className="text-sm text-slate-700">
                  Producto activo en el catalogo publico
                </span>
              </label>
            </Field>
          </div>

          <Field label="Descripcion" className="mt-5" error={fieldErrors.description} required>
            <textarea
              rows="5"
              value={formValues.description}
              onChange={(event) => updateValue('description', event.target.value)}
              className={getFieldInputClassName(fieldErrors.description)}
              placeholder="Describe aroma, detalles y uso ideal."
            />
          </Field>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="admin-panel p-6">
            <Field label="Foto principal">
              <input type="file" accept="image/*" onChange={handleMainImageChange} className="field-input" />
            </Field>

            <div className="mt-5">
              {mainPreview ? (
                <img
                  src={mainPreview}
                  alt="Vista previa principal"
                  className="h-72 w-full rounded-[1.75rem] object-cover"
                />
              ) : (
                <ImagePlaceholder label="Foto principal" className="h-72 w-full" />
              )}
            </div>
          </div>

          <div className="admin-panel p-6">
            <Field label="Galeria adicional">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryChange}
                className="field-input"
              />
            </Field>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {existingGallery.map((image) => (
                <div key={image.id} className="rounded-[1.5rem] border border-dashed border-mist/55 bg-white/82 p-3">
                  <img
                    src={image.image_url}
                    alt="Imagen adicional"
                    className="h-36 w-full rounded-[1.25rem] object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onDeleteImage(image)}
                    disabled={saving}
                    className="btn-danger mt-3 w-full disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Eliminar imagen
                  </button>
                </div>
              ))}

              {galleryPreviews.map((preview) => (
                <img
                  key={preview}
                  src={preview}
                  alt="Vista previa de galeria"
                  className="h-36 w-full rounded-[1.25rem] object-cover"
                />
              ))}
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {!error && warning ? <p className="text-sm text-amber-700">{warning}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || loading}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? saveLabel || 'Guardando producto...' : 'Guardar producto'}
          </button>
          <Link to="/admin/productos" className="btn-secondary">
            Cancelar
          </Link>
        </div>
      </form>

      <CategoryModal
        open={isCategoryModalOpen}
        saving={savingCategory}
        onClose={() => setIsCategoryModalOpen(false)}
        onCreateCategory={handleCreateCategory}
        onCreated={(category) => updateValue('categoryId', category.id)}
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
