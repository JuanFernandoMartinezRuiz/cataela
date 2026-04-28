import { useEffect, useState } from 'react'
import ErrorState from '../../components/common/ErrorState'
import ImagePlaceholder from '../../components/common/ImagePlaceholder'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import StatusBadge from '../../components/common/StatusBadge'
import { useToast } from '../../providers/ToastProvider'
import {
  deleteRaffleAssets,
  deleteStoredAsset,
  fetchRaffleImages,
  uploadMainRaffleImage,
  uploadMainRaffleImageForDraft,
  uploadRaffleGalleryImages,
} from '../../services/imageService'
import {
  createRaffleWithNumbers,
  deleteRaffle,
  fetchRaffleById,
  fetchRaffleNumbers,
  fetchRaffles,
  getRaffleSummary,
  raffleNumberStatuses,
  raffleStatuses,
  updateRaffle,
  updateRaffleNumber,
} from '../../services/raffleService'
import { formatCurrency, formatDate } from '../../utils/formatters'

const emptyRaffleForm = {
  title: '',
  prize: '',
  description: '',
  price_per_number: '',
  status: 'draft',
  draw_date: '',
}

const statusDescriptions = {
  draft: 'No se muestra al publico.',
  active: 'Se muestra en la pagina publica y oculta cualquier otra rifa activa.',
  closed: 'Se oculta del publico y queda archivada.',
}

export default function AdminRafflesPage() {
  const { showToast } = useToast()
  const [raffles, setRaffles] = useState([])
  const [selectedRaffleId, setSelectedRaffleId] = useState('')
  const [selectedRaffle, setSelectedRaffle] = useState(null)
  const [numbers, setNumbers] = useState([])
  const [raffleImages, setRaffleImages] = useState([])
  const [raffleForm, setRaffleForm] = useState(emptyRaffleForm)
  const [createMainImageFile, setCreateMainImageFile] = useState(null)
  const [createMainPreview, setCreateMainPreview] = useState('')
  const [createGalleryFiles, setCreateGalleryFiles] = useState([])
  const [createGalleryPreviews, setCreateGalleryPreviews] = useState([])
  const [numberForm, setNumberForm] = useState(null)
  const [filter, setFilter] = useState('all')
  const [selectedMainImageFile, setSelectedMainImageFile] = useState(null)
  const [selectedMainPreview, setSelectedMainPreview] = useState('')
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState([])
  const [selectedGalleryPreviews, setSelectedGalleryPreviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingRaffleId, setDeletingRaffleId] = useState('')
  const [saveLabel, setSaveLabel] = useState('')
  const [warning, setWarning] = useState('')
  const [error, setError] = useState('')
  const [createFieldErrors, setCreateFieldErrors] = useState({})
  const [editFieldErrors, setEditFieldErrors] = useState({})

  useEffect(() => {
    loadRaffles()
  }, [])

  useEffect(() => {
    if (selectedRaffleId) {
      loadNumbers(selectedRaffleId)
    }
  }, [selectedRaffleId])

  async function loadRaffles() {
    try {
      setLoading(true)
      const raffleRows = await fetchRaffles()
      setRaffles(raffleRows)

      if (raffleRows.length && !selectedRaffleId) {
        setSelectedRaffleId(raffleRows[0].id)
        setSelectedRaffle(raffleRows[0])
      } else if (selectedRaffleId) {
        const refreshedSelection =
          raffleRows.find((raffle) => raffle.id === selectedRaffleId) || null
        setSelectedRaffle(refreshedSelection)
      }
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar las rifas.')
    } finally {
      setLoading(false)
    }
  }

  async function loadNumbers(raffleId) {
    try {
      const [raffleRow, numberRows, imageRows] = await Promise.all([
        fetchRaffleById(raffleId),
        fetchRaffleNumbers(raffleId),
        fetchRaffleImages(raffleId),
      ])

      setSelectedRaffle(raffleRow || null)
      setNumbers(numberRows)
      setRaffleImages(imageRows)
      setSelectedMainPreview(raffleRow?.main_image_url || '')
      setNumberForm(null)
      setSelectedMainImageFile(null)
      setSelectedGalleryFiles([])
      resetPreviewUrls(selectedGalleryPreviews)
      setSelectedGalleryPreviews([])
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar los numeros.')
    }
  }

  async function handleCreateRaffle(event) {
    event.preventDefault()
    const nextFieldErrors = validateRaffleForm(raffleForm)

    if (Object.keys(nextFieldErrors).length) {
      setCreateFieldErrors(nextFieldErrors)
      setError('Revisa los campos.')
      showToast({
        title: 'Revisa los campos',
        description: 'Completa la informacion obligatoria de la rifa.',
        tone: 'error',
      })
      return
    }

    if (raffleForm.status === 'active') {
      const confirmed = window.confirm(
        'Esta rifa se creara como activa y cualquier otra rifa activa se cerrara automaticamente. ¿Deseas continuar?',
      )

      if (!confirmed) {
        return
      }
    }

    setSaving(true)
    setSaveLabel('')
    setWarning('')
    setError('')
    setCreateFieldErrors({})

    try {
      let uploadedMainImage = null
      let galleryUploadFailed = false

      if (createMainImageFile) {
        try {
          setSaveLabel('Subiendo imagen principal...')
          uploadedMainImage = await uploadMainRaffleImageForDraft({
            raffleTitle: raffleForm.title,
            file: createMainImageFile,
          })
        } catch {
          throw new Error(
            'No fue posible subir la imagen principal del premio. La rifa no se guardo.',
          )
        }
      }

      let createdRaffle = null

      try {
        setSaveLabel('Creando rifa...')
        createdRaffle = await createRaffleWithNumbers({
          ...raffleForm,
          price_per_number: Number(raffleForm.price_per_number || 0),
          main_image_url: uploadedMainImage?.publicUrl || null,
        })
      } catch (createError) {
        if (uploadedMainImage?.storagePath) {
          try {
            await deleteStoredAsset(
              uploadedMainImage.publicUrl,
              'raffles',
            )
          } catch {
            // best-effort cleanup
          }
        }

        throw createError
      }

      if (createGalleryFiles.length) {
        try {
          setSaveLabel('Subiendo galeria...')
          await uploadRaffleGalleryImages(createdRaffle.id, createGalleryFiles, 0)
        } catch {
          galleryUploadFailed = true
          setWarning(
            'La rifa se creo correctamente, pero una o mas imagenes adicionales no se pudieron subir.',
          )
          showToast({
            title: 'Guardado con advertencias',
            description:
              'La rifa se creo correctamente, pero una o mas imagenes adicionales no se pudieron subir.',
            tone: 'warning',
          })
        }
      }

      setRaffleForm(emptyRaffleForm)
      setCreateMainImageFile(null)
      setCreateMainPreview('')
      setCreateGalleryFiles([])
      resetPreviewUrls(createGalleryPreviews)
      setCreateGalleryPreviews([])
      if (!galleryUploadFailed) {
        showToast({
          title: 'Elemento guardado',
          description: 'La rifa se creo correctamente.',
          tone: 'success',
        })
      }
      await loadRaffles()
      setSelectedRaffleId(createdRaffle.id)
    } catch (saveError) {
      setError(saveError.message || 'No fue posible crear la rifa.')
      showToast({
        title: 'Error al guardar',
        description: saveError.message || 'No fue posible crear la rifa.',
        tone: 'error',
      })
    } finally {
      setSaving(false)
      setSaveLabel('')
    }
  }

  async function handleSaveRaffleDetails(event) {
    event.preventDefault()
    if (!selectedRaffle) {
      return
    }

    const nextFieldErrors = validateRaffleForm(selectedRaffle)

    if (Object.keys(nextFieldErrors).length) {
      setEditFieldErrors(nextFieldErrors)
      setError('Revisa los campos.')
      showToast({
        title: 'Revisa los campos',
        description: 'Completa la informacion obligatoria de la rifa.',
        tone: 'error',
      })
      return
    }

    const originalRaffle = raffles.find((raffle) => raffle.id === selectedRaffle.id)
    const isChangingToActive =
      selectedRaffle.status === 'active' && originalRaffle?.status !== 'active'
    const isChangingToClosed =
      selectedRaffle.status === 'closed' && originalRaffle?.status !== 'closed'

    if (isChangingToActive) {
      const confirmed = window.confirm(
        'Esta rifa pasara a ser la activa y cualquier otra rifa activa se cerrara automaticamente. ¿Deseas continuar?',
      )

      if (!confirmed) {
        return
      }
    }

    if (isChangingToClosed) {
      const confirmed = window.confirm(
        'Esta rifa dejara de mostrarse al publico al cambiarse a cerrada. ¿Deseas continuar?',
      )

      if (!confirmed) {
        return
      }
    }

    try {
      setSaving(true)
      setSaveLabel('Guardando rifa...')
      setError('')
      setWarning('')
      setEditFieldErrors({})

      await updateRaffle(selectedRaffle.id, {
        title: selectedRaffle.title,
        prize: selectedRaffle.prize,
        description: selectedRaffle.description,
        price_per_number: Number(selectedRaffle.price_per_number || 0),
        draw_date: selectedRaffle.draw_date,
        status: selectedRaffle.status,
        winner_number: selectedRaffle.winner_number || null,
      })

      await loadRaffles()
      await loadNumbers(selectedRaffle.id)
      showToast({
        title: 'Elemento guardado',
        description: 'La rifa se actualizo correctamente.',
        tone: 'success',
      })
    } catch (saveError) {
      setError(saveError.message || 'No fue posible guardar los cambios de la rifa.')
      showToast({
        title: 'Error al guardar',
        description: saveError.message || 'No fue posible guardar la rifa.',
        tone: 'error',
      })
    } finally {
      setSaving(false)
      setSaveLabel('')
    }
  }

  async function handleSaveNumber(event) {
    event.preventDefault()
    if (!numberForm) {
      return
    }

    const originalNumber = numbers.find((number) => number.id === numberForm.id)

    if (numberForm.status === 'winner' && originalNumber?.status !== 'winner') {
      const winnerOnUnpaid =
        originalNumber?.status !== 'paid' && originalNumber?.status !== 'winner'

      if (winnerOnUnpaid) {
        const confirmed = window.confirm(
          'Este numero no esta marcado como pagado. ¿Deseas marcarlo como ganador de todas formas?',
        )

        if (!confirmed) {
          return
        }
      } else {
        const confirmed = window.confirm(
          `Se marcara el numero ${numberForm.number} como ganador. Si ya existe otro ganador, se reemplazara. ¿Deseas continuar?`,
        )

        if (!confirmed) {
          return
        }
      }
    }

    try {
      setSaving(true)
      setSaveLabel('Guardando numero...')
      setWarning('')
      setError('')
      await updateRaffleNumber(numberForm.id, {
        raffle_id: selectedRaffle.id,
        status: numberForm.status,
        buyer_name: numberForm.buyer_name || null,
        buyer_phone: numberForm.buyer_phone || null,
      })
      await loadNumbers(selectedRaffle.id)
      showToast({
        title: 'Elemento guardado',
        description: 'El numero de la rifa se actualizo correctamente.',
        tone: 'success',
      })
    } catch (saveError) {
      setError(saveError.message || 'No fue posible guardar el numero.')
      showToast({
        title: 'Error al guardar',
        description: saveError.message || 'No fue posible guardar el numero.',
        tone: 'error',
      })
    } finally {
      setSaving(false)
      setSaveLabel('')
    }
  }

  async function handleSaveRaffleImages() {
    if (!selectedRaffle) {
      return
    }

    if (!selectedMainImageFile && !selectedGalleryFiles.length) {
      return
    }

    setSaving(true)
    setSaveLabel('')
    setWarning('')
    setError('')

    try {
      let galleryUploadFailed = false
      if (selectedMainImageFile) {
        let newMainImageUrl = null

        try {
          setSaveLabel('Subiendo imagen principal...')
          newMainImageUrl = await uploadMainRaffleImage(
            selectedRaffle.id,
            selectedMainImageFile,
          )
          setSaveLabel('Guardando rifa...')
          await updateRaffle(selectedRaffle.id, {
            main_image_url: newMainImageUrl,
          })
        } catch (mainImageError) {
          if (newMainImageUrl) {
            try {
              await deleteStoredAsset(newMainImageUrl, 'raffles')
            } catch {
              // best-effort cleanup
            }
          }

          throw mainImageError
        }
      }

      if (selectedGalleryFiles.length) {
        try {
          setSaveLabel('Subiendo galeria...')
          await uploadRaffleGalleryImages(
            selectedRaffle.id,
            selectedGalleryFiles,
            raffleImages.length,
          )
        } catch {
          galleryUploadFailed = true
          setWarning(
            'La imagen principal se guardo, pero una o mas imagenes adicionales no se pudieron subir.',
          )
          showToast({
            title: 'Guardado con advertencias',
            description:
              'La imagen principal se guardo, pero una o mas imagenes adicionales no se pudieron subir.',
            tone: 'warning',
          })
        }
      }

      await loadNumbers(selectedRaffle.id)
      if (!galleryUploadFailed) {
        showToast({
          title: 'Elemento guardado',
          description: 'Las imagenes de la rifa se actualizaron correctamente.',
          tone: 'success',
        })
      }
    } catch (saveError) {
      setError(saveError.message || 'No fue posible actualizar las imagenes de la rifa.')
      showToast({
        title: 'Error al guardar',
        description: saveError.message || 'No fue posible actualizar las imagenes.',
        tone: 'error',
      })
    } finally {
      setSaving(false)
      setSaveLabel('')
    }
  }

  async function handleDeleteSelectedRaffle() {
    if (!selectedRaffle) {
      return
    }

    const confirmed = window.confirm('¿Seguro que deseas eliminar este elemento?')
    if (!confirmed) {
      return
    }

    try {
      setDeletingRaffleId(selectedRaffle.id)
      setError('')
      await deleteRaffleAssets({
        main_image_url: selectedRaffle.main_image_url,
        gallery: raffleImages,
      })
      await deleteRaffle(selectedRaffle.id)
      setSelectedRaffleId('')
      setSelectedRaffle(null)
      setNumbers([])
      setRaffleImages([])
      setNumberForm(null)
      await loadRaffles()
      showToast({
        title: 'Elemento eliminado',
        description: 'La rifa se elimino correctamente.',
        tone: 'success',
      })
    } catch (deleteError) {
      setError(deleteError.message || 'No fue posible eliminar la rifa.')
      showToast({
        title: 'Error al eliminar',
        description: deleteError.message || 'No fue posible eliminar la rifa.',
        tone: 'error',
      })
    } finally {
      setDeletingRaffleId('')
    }
  }

  function handleCreateMainImageChange(event) {
    const nextFile = event.target.files?.[0] || null
    setCreateMainImageFile(nextFile)
    setCreateMainPreview(nextFile ? URL.createObjectURL(nextFile) : '')
  }

  function handleCreateGalleryChange(event) {
    const nextFiles = Array.from(event.target.files || [])
    resetPreviewUrls(createGalleryPreviews)
    setCreateGalleryFiles(nextFiles)
    setCreateGalleryPreviews(nextFiles.map((file) => URL.createObjectURL(file)))
  }

  function handleSelectedMainImageChange(event) {
    const nextFile = event.target.files?.[0] || null
    setSelectedMainImageFile(nextFile)
    setSelectedMainPreview(nextFile ? URL.createObjectURL(nextFile) : selectedRaffle?.main_image_url || '')
  }

  function handleSelectedGalleryChange(event) {
    const nextFiles = Array.from(event.target.files || [])
    resetPreviewUrls(selectedGalleryPreviews)
    setSelectedGalleryFiles(nextFiles)
    setSelectedGalleryPreviews(nextFiles.map((file) => URL.createObjectURL(file)))
  }

  function updateCreateForm(field, value) {
    setRaffleForm((current) => ({ ...current, [field]: value }))
    setCreateFieldErrors((current) => clearFieldError(current, field))
  }

  function updateSelectedRaffle(field, value) {
    setSelectedRaffle((current) => ({ ...current, [field]: value }))
    setEditFieldErrors((current) => clearFieldError(current, field))
  }

  const visibleNumbers =
    filter === 'all' ? numbers : numbers.filter((number) => number.status === filter)
  const summary = getRaffleSummary(selectedRaffle, numbers)
  const winnerNumber = numbers.find((number) => number.status === 'winner') || null

  return (
    <>
      <div className="admin-panel p-6 md:p-8">
        <PageHeading
          eyebrow="Rifas"
          title="Gestiona rifas y numeros"
          description="Crea rifas, genera los numeros 00 al 99 y actualiza comprador, telefono y estado desde el panel."
        />
      </div>

      {loading ? <LoadingState label="Cargando rifas..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && warning ? (
        <div className="admin-panel p-4 text-sm text-amber-700">{warning}</div>
      ) : null}

      {!loading ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <form onSubmit={handleCreateRaffle} className="admin-panel p-6">
              <h2 className="font-display text-3xl text-slate-700">Crear nueva rifa</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Titulo">
                  <input
                    value={raffleForm.title}
                    onChange={(event) => updateCreateForm('title', event.target.value)}
                    className={getFieldInputClassName(createFieldErrors.title)}
                  />
                  {createFieldErrors.title ? <p className="field-error">{createFieldErrors.title}</p> : null}
                </Field>
                <Field label="Premio">
                  <input
                    className={getFieldInputClassName(createFieldErrors.prize)}
                    value={raffleForm.prize}
                    onChange={(event) => updateCreateForm('prize', event.target.value)}
                  />
                  {createFieldErrors.prize ? <p className="field-error">{createFieldErrors.prize}</p> : null}
                </Field>
                <Field label="Precio por numero">
                  <input
                    type="number"
                    min="0"
                    className={getFieldInputClassName(createFieldErrors.price_per_number)}
                    value={raffleForm.price_per_number}
                    onChange={(event) => updateCreateForm('price_per_number', event.target.value)}
                  />
                  {createFieldErrors.price_per_number ? (
                    <p className="field-error">{createFieldErrors.price_per_number}</p>
                  ) : null}
                </Field>
                <Field label="Fecha sorteo">
                  <input
                    type="date"
                    className={getFieldInputClassName(createFieldErrors.draw_date)}
                    value={raffleForm.draw_date}
                    onChange={(event) => updateCreateForm('draw_date', event.target.value)}
                  />
                  {createFieldErrors.draw_date ? (
                    <p className="field-error">{createFieldErrors.draw_date}</p>
                  ) : null}
                </Field>
                <Field label="Estado">
                  <select
                    className="field-input"
                    value={raffleForm.status}
                    onChange={(event) => updateCreateForm('status', event.target.value)}
                  >
                    {raffleStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Descripcion" className="md:col-span-2">
                  <textarea
                    rows="4"
                    className={getFieldInputClassName(createFieldErrors.description)}
                    value={raffleForm.description}
                    onChange={(event) => updateCreateForm('description', event.target.value)}
                  />
                  {createFieldErrors.description ? (
                    <p className="field-error">{createFieldErrors.description}</p>
                  ) : null}
                </Field>
                <Field label="Foto principal del premio" className="md:col-span-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCreateMainImageChange}
                    className="field-input"
                  />
                </Field>
                <Field label="Imagenes adicionales" className="md:col-span-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleCreateGalleryChange}
                    className="field-input"
                  />
                </Field>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {createMainPreview ? (
                  <img
                    src={createMainPreview}
                    alt="Vista previa principal"
                    className="h-48 w-full rounded-[1.5rem] object-cover"
                  />
                ) : (
                  <ImagePlaceholder label="Premio principal" className="h-48 w-full" />
                )}
                <div className="grid grid-cols-2 gap-3">
                  {createGalleryPreviews.map((preview) => (
                    <img
                      key={preview}
                      src={preview}
                      alt="Vista previa galeria"
                      className="h-24 w-full rounded-[1.25rem] object-cover"
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary mt-6 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? saveLabel || 'Creando...' : 'Crear rifa y generar numeros'}
              </button>
              <p className="mt-3 text-sm text-slate-500">
                Si la creas como <strong>active</strong>, cualquier otra rifa activa pasara a
                <strong> closed</strong> automaticamente.
              </p>
            </form>

            <div className="admin-panel p-6">
              <h2 className="font-display text-3xl text-slate-700">Rifas creadas</h2>
              <div className="mt-5 space-y-3">
                {raffles.map((raffle) => (
                  <button
                    key={raffle.id}
                    type="button"
                    onClick={() => setSelectedRaffleId(raffle.id)}
                    className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                      selectedRaffleId === raffle.id
                        ? 'border-mist bg-mist/10'
                        : 'border-sand/50 bg-white/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-700">{raffle.title}</p>
                        <p className="text-sm text-slate-500">{formatDate(raffle.draw_date)}</p>
                      </div>
                      <StatusBadge tone={raffle.status}>{raffle.status}</StatusBadge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {selectedRaffle ? (
              <>
                <form onSubmit={handleSaveRaffleDetails} className="admin-panel p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Rifa seleccionada
                      </p>
                      <h2 className="mt-2 font-display text-4xl text-slate-700">
                        Editar datos de la rifa
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge tone={selectedRaffle.status}>
                        {selectedRaffle.status}
                      </StatusBadge>
                      {summary.isComplete ? (
                        <span className="inline-flex rounded-full border border-dashed border-sageDeep/80 bg-sage/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                          Rifa completa
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field label="Titulo">
                      <input
                        className={getFieldInputClassName(editFieldErrors.title)}
                        value={selectedRaffle.title || ''}
                        onChange={(event) => updateSelectedRaffle('title', event.target.value)}
                      />
                      {editFieldErrors.title ? <p className="field-error">{editFieldErrors.title}</p> : null}
                    </Field>
                    <Field label="Premio">
                      <input
                        className={getFieldInputClassName(editFieldErrors.prize)}
                        value={selectedRaffle.prize || ''}
                        onChange={(event) => updateSelectedRaffle('prize', event.target.value)}
                      />
                      {editFieldErrors.prize ? <p className="field-error">{editFieldErrors.prize}</p> : null}
                    </Field>
                    <Field label="Precio por numero">
                      <input
                        type="number"
                        min="0"
                        className={getFieldInputClassName(editFieldErrors.price_per_number)}
                        value={selectedRaffle.price_per_number || ''}
                        onChange={(event) =>
                          updateSelectedRaffle('price_per_number', event.target.value)
                        }
                      />
                      {editFieldErrors.price_per_number ? (
                        <p className="field-error">{editFieldErrors.price_per_number}</p>
                      ) : null}
                    </Field>
                    <Field label="Fecha sorteo">
                      <input
                        type="date"
                        className={getFieldInputClassName(editFieldErrors.draw_date)}
                        value={selectedRaffle.draw_date || ''}
                        onChange={(event) => updateSelectedRaffle('draw_date', event.target.value)}
                      />
                      {editFieldErrors.draw_date ? (
                        <p className="field-error">{editFieldErrors.draw_date}</p>
                      ) : null}
                    </Field>
                    <Field label="Estado">
                      <select
                        className="field-input"
                        value={selectedRaffle.status}
                        onChange={(event) => updateSelectedRaffle('status', event.target.value)}
                      >
                        {raffleStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-slate-500">
                        {statusDescriptions[selectedRaffle.status]}
                      </p>
                    </Field>
                    <Field label="Numero ganador actual">
                      <input
                        className="field-input"
                        value={selectedRaffle.winner_number || ''}
                        placeholder="Se actualiza solo o puedes dejar referencia manual"
                        onChange={(event) =>
                          setSelectedRaffle((current) => ({
                            ...current,
                            winner_number: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Descripcion" className="md:col-span-2">
                      <textarea
                        rows="4"
                        className={getFieldInputClassName(editFieldErrors.description)}
                        value={selectedRaffle.description || ''}
                        onChange={(event) =>
                          updateSelectedRaffle('description', event.target.value)
                        }
                      />
                      {editFieldErrors.description ? (
                        <p className="field-error">{editFieldErrors.description}</p>
                      ) : null}
                    </Field>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard label="Total" value={summary.total} />
                    <SummaryCard label="Disponibles" value={summary.availableCount} />
                    <SummaryCard label="Apartados" value={summary.reservedCount} />
                    <SummaryCard label="Pagados" value={summary.paidCount} />
                    <SummaryCard
                      label="Ganador"
                      value={winnerNumber?.number || summary.winnerCount || 'Sin ganador'}
                    />
                    <SummaryCard
                      label="Ingreso pagado"
                      value={formatCurrency(summary.paidRevenue)}
                    />
                    <SummaryCard
                      label="Ingreso pendiente"
                      value={formatCurrency(summary.pendingRevenue)}
                    />
                    <SummaryCard
                      label="Ingreso total esperado"
                      value={formatCurrency(summary.potentialRevenue)}
                    />
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary disabled:cursor-not-allowed disabled:opacity-70"
                    >
                    {saving ? saveLabel || 'Guardando...' : 'Guardar cambios de la rifa'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedRaffle}
                      disabled={deletingRaffleId === selectedRaffle.id}
                      className="btn-danger disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {deletingRaffleId === selectedRaffle.id ? 'Eliminando...' : 'Eliminar rifa'}
                    </button>
                  </div>
                </form>

                <div className="admin-panel p-6">
                  <h3 className="font-display text-3xl text-slate-700">Imagenes del premio</h3>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field label="Actualizar foto principal">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSelectedMainImageChange}
                        className="field-input"
                      />
                    </Field>
                    <Field label="Agregar imagenes adicionales">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleSelectedGalleryChange}
                        className="field-input"
                      />
                    </Field>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {selectedMainPreview ? (
                      <img
                        src={selectedMainPreview}
                        alt="Premio principal"
                        className="h-56 w-full rounded-[1.75rem] object-cover"
                      />
                    ) : (
                      <ImagePlaceholder label="Sin foto principal" className="h-56 w-full" />
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {raffleImages.map((image) => (
                        <img
                          key={image.id}
                          src={image.image_url}
                          alt="Imagen adicional de la rifa"
                          className="h-28 w-full rounded-[1.25rem] object-cover"
                        />
                      ))}
                      {selectedGalleryPreviews.map((preview) => (
                        <img
                          key={preview}
                          src={preview}
                          alt="Vista previa nueva de galeria"
                          className="h-28 w-full rounded-[1.25rem] object-cover"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveRaffleImages}
                    disabled={saving}
                    className="btn-primary mt-6 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? saveLabel || 'Guardando...' : 'Guardar imagenes'}
                  </button>
                </div>

                <div className="admin-panel p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-3xl text-slate-700">Numeros de la rifa</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Puedes seguir editando cualquier numero manualmente en todo momento.
                      </p>
                    </div>
                    {summary.isComplete ? (
                      <span className="inline-flex rounded-full border border-dashed border-sageDeep/80 bg-sage/45 px-4 py-2 text-sm font-semibold text-slate-700">
                        Rifa completa
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['all', ...raffleNumberStatuses].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFilter(status)}
                        className={`filter-pill ${
                          filter === status
                            ? 'filter-pill-active'
                            : 'filter-pill-idle'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 grid grid-cols-5 gap-3 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10">
                    {visibleNumbers.map((number) => (
                      <button
                        key={number.id}
                        type="button"
                        onClick={() => setNumberForm(number)}
                        className={`aspect-square rounded-2xl border text-sm font-semibold shadow-soft transition hover:-translate-y-0.5 ${
                          stateStyles[number.status]
                        }`}
                      >
                        {number.number}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-panel p-6">
                  <h3 className="font-display text-3xl text-slate-700">Editar numero</h3>
                  {numberForm ? (
                    <form onSubmit={handleSaveNumber} className="mt-5 grid gap-4 md:grid-cols-2">
                      <Field label="Numero">
                        <input value={numberForm.number} readOnly className="field-input" />
                      </Field>
                      <Field label="Estado">
                        <select
                          value={numberForm.status}
                          onChange={(event) =>
                            setNumberForm((current) => ({
                              ...current,
                              status: event.target.value,
                            }))
                          }
                          className="field-input"
                        >
                          {raffleNumberStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        {numberForm.status === 'winner' &&
                        numberForm.id &&
                        numbers.find((number) => number.id === numberForm.id)?.status !== 'paid' &&
                        numbers.find((number) => number.id === numberForm.id)?.status !== 'winner' ? (
                          <p className="mt-2 text-xs text-amber-700">
                            Se mostrara una advertencia si marcas este numero como ganador sin estar pagado.
                          </p>
                        ) : null}
                      </Field>
                      <Field label="Comprador">
                        <input
                          value={numberForm.buyer_name || ''}
                          onChange={(event) =>
                            setNumberForm((current) => ({
                              ...current,
                              buyer_name: event.target.value,
                            }))
                          }
                          className="field-input"
                        />
                      </Field>
                      <Field label="Telefono">
                        <input
                          value={numberForm.buyer_phone || ''}
                          onChange={(event) =>
                            setNumberForm((current) => ({
                              ...current,
                              buyer_phone: event.target.value,
                            }))
                          }
                          className="field-input"
                        />
                      </Field>
                      <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary md:col-span-2 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {saving ? saveLabel || 'Guardando...' : 'Guardar numero'}
                      </button>
                    </form>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      Selecciona un numero para editar su estado y datos del comprador.
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
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

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-[1.4rem] border border-white/70 bg-white/85 p-4 shadow-soft">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl text-slate-700">{value}</p>
    </div>
  )
}

function validateRaffleForm(values) {
  const errors = {}

  if (!values?.title?.trim()) {
    errors.title = 'Este campo es obligatorio.'
  }

  if (!values?.prize?.trim()) {
    errors.prize = 'Este campo es obligatorio.'
  }

  if (!values?.price_per_number) {
    errors.price_per_number = 'Este campo es obligatorio.'
  }

  if (!values?.draw_date) {
    errors.draw_date = 'Este campo es obligatorio.'
  }

  if (!values?.description?.trim()) {
    errors.description = 'Este campo es obligatorio.'
  }

  return errors
}

function clearFieldError(errors, field) {
  if (!errors[field]) {
    return errors
  }

  const nextErrors = { ...errors }
  delete nextErrors[field]
  return nextErrors
}

function getFieldInputClassName(hasError) {
  return `field-input ${hasError ? 'field-input-error' : ''}`.trim()
}

const stateStyles = {
  available: 'bg-mist/16 text-slate-700 border-mist/55',
  reserved: 'bg-sun/78 text-slate-700 border-sunDeep/80',
  paid: 'bg-sage text-slate-700 border-sageDeep/80',
  winner: 'bg-rose/62 text-slate-700 border-roseDeep/80 ring-2 ring-white/80',
}

function resetPreviewUrls(previews) {
  previews.forEach((preview) => URL.revokeObjectURL(preview))
}
