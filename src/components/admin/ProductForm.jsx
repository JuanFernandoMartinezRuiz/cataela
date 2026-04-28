import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CategoryModal from './CategoryModal'
import ImagePlaceholder from '../common/ImagePlaceholder'
import { useToast } from '../../providers/ToastProvider'
import { buildProductImageStyle } from '../../utils/productImageSettings'

const initialState = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  isActive: true,
  imagePositionX: 50,
  imagePositionY: 50,
  imageZoom: 1,
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
      imagePositionX: initialValues.image_position_x ?? 50,
      imagePositionY: initialValues.image_position_y ?? 50,
      imageZoom: initialValues.image_zoom ?? 1,
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
            <div>
              <h3 className="font-display text-3xl text-slate-700">Ajuste de portada</h3>
              <p className="mt-2 text-sm text-slate-500">
                Controla como se recorta la foto principal dentro de la card del catalogo.
              </p>
            </div>

            {mainPreview ? (
              <>
                <div className="mt-5 rounded-[1.75rem] border border-dashed border-mist/55 bg-white/82 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Vista previa de la card
                  </p>
                  <div className="mt-4 rounded-[1.6rem] border border-dashed border-mist/55 bg-white p-4 shadow-soft">
                    <div className="overflow-hidden rounded-[1.45rem]">
                      <div className="h-64 w-full overflow-hidden rounded-[1.45rem]">
                        <img
                          src={mainPreview}
                          alt="Vista previa de portada"
                          className="h-full w-full object-cover"
                          style={buildProductImageStyle({
                            image_position_x: formValues.imagePositionX,
                            image_position_y: formValues.imagePositionY,
                            image_zoom: formValues.imageZoom,
                          })}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        {categories.find((category) => category.id === formValues.categoryId)?.name ||
                          'Coleccion Cataela'}
                      </p>
                      <p className="mt-2 font-display text-3xl text-slate-700">
                        {formValues.name || 'Nombre del producto'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-5">
                  <RangeField
                    label="Posicion horizontal"
                    value={Number(formValues.imagePositionX || 50)}
                    min={0}
                    max={100}
                    step={1}
                    displayValue={`${Math.round(Number(formValues.imagePositionX || 50))}%`}
                    onChange={(value) => updateValue('imagePositionX', value)}
                  />
                  <RangeField
                    label="Posicion vertical"
                    value={Number(formValues.imagePositionY || 50)}
                    min={0}
                    max={100}
                    step={1}
                    displayValue={`${Math.round(Number(formValues.imagePositionY || 50))}%`}
                    onChange={(value) => updateValue('imagePositionY', value)}
                  />
                  <RangeField
                    label="Zoom"
                    value={Number(formValues.imageZoom || 1)}
                    min={1}
                    max={2.5}
                    step={0.01}
                    displayValue={`${Number(formValues.imageZoom || 1).toFixed(2)}x`}
                    onChange={(value) => updateValue('imageZoom', value)}
                  />
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-[1.5rem] border border-dashed border-mist/55 bg-white/82 p-5 text-sm text-slate-500">
                Sube una foto principal para ajustar su recorte dentro de la card del catalogo.
              </div>
            )}
          </div>

          <div className="admin-panel p-6 xl:col-span-2">
            <Field label="Galeria adicional">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryChange}
                className="field-input"
              />
            </Field>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

function RangeField({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-mist/55 bg-white/82 p-4">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-600">{label}</label>
        <span className="text-sm font-semibold text-slate-500">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-mist/20 accent-mist"
      />
    </div>
  )
}
