import { useEffect, useState } from 'react'
import ErrorState from '../../components/common/ErrorState'
import ImagePlaceholder from '../../components/common/ImagePlaceholder'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import StatusBadge from '../../components/common/StatusBadge'
import {
  deleteStoredAsset,
  fetchRaffleImages,
  uploadMainRaffleImage,
  uploadMainRaffleImageForDraft,
  uploadRaffleGalleryImages,
} from '../../services/imageService'
import {
  createRaffleWithNumbers,
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
  const [saveLabel, setSaveLabel] = useState('')
  const [warning, setWarning] = useState('')
  const [error, setError] = useState('')

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
    setSaving(true)
    setSaveLabel('')
    setWarning('')
    setError('')

    try {
      let uploadedMainImage = null

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
          setWarning(
            'La rifa se creo correctamente, pero una o mas imagenes adicionales no se pudieron subir.',
          )
        }
      }

      setRaffleForm(emptyRaffleForm)
      setCreateMainImageFile(null)
      setCreateMainPreview('')
      setCreateGalleryFiles([])
      resetPreviewUrls(createGalleryPreviews)
      setCreateGalleryPreviews([])
      await loadRaffles()
      setSelectedRaffleId(createdRaffle.id)
    } catch (saveError) {
      setError(saveError.message || 'No fue posible crear la rifa.')
    } finally {
      setSaving(false)
      setSaveLabel('')
    }
  }

  async function handleUpdateRaffleMeta(field, value) {
    if (!selectedRaffle) {
      return
    }

    const nextRaffle = { ...selectedRaffle, [field]: value }
    setSelectedRaffle(nextRaffle)

    try {
      await updateRaffle(selectedRaffle.id, { [field]: value })
      await loadRaffles()
      setSelectedRaffleId(selectedRaffle.id)
    } catch (updateError) {
      setError(updateError.message || 'No fue posible actualizar la rifa.')
    }
  }

  async function handleSaveRaffleDetails(event) {
    event.preventDefault()
    if (!selectedRaffle) {
      return
    }

    try {
      setSaving(true)
      setSaveLabel('Guardando rifa...')
      setError('')
      setWarning('')

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
    } catch (saveError) {
      setError(saveError.message || 'No fue posible guardar los cambios de la rifa.')
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

    try {
      setSaving(true)
      setSaveLabel('Guardando numero...')
      await updateRaffleNumber(numberForm.id, {
        raffle_id: selectedRaffle.id,
        status: numberForm.status,
        buyer_name: numberForm.buyer_name || null,
        buyer_phone: numberForm.buyer_phone || null,
      })
      await loadNumbers(selectedRaffle.id)
    } catch (saveError) {
      setError(saveError.message || 'No fue posible guardar el numero.')
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
          setWarning(
            'La imagen principal se guardo, pero una o mas imagenes adicionales no se pudieron subir.',
          )
        }
      }

      await loadNumbers(selectedRaffle.id)
    } catch (saveError) {
      setError(saveError.message || 'No fue posible actualizar las imagenes de la rifa.')
    } finally {
      setSaving(false)
      setSaveLabel('')
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

  const visibleNumbers =
    filter === 'all' ? numbers : numbers.filter((number) => number.status === filter)
  const summary = getRaffleSummary(selectedRaffle, numbers)

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
                    className="field-input"
                    value={raffleForm.title}
                    onChange={(event) =>
                      setRaffleForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Premio">
                  <input
                    className="field-input"
                    value={raffleForm.prize}
                    onChange={(event) =>
                      setRaffleForm((current) => ({ ...current, prize: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Precio por numero">
                  <input
                    type="number"
                    min="0"
                    className="field-input"
                    value={raffleForm.price_per_number}
                    onChange={(event) =>
                      setRaffleForm((current) => ({
                        ...current,
                        price_per_number: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Fecha sorteo">
                  <input
                    type="date"
                    className="field-input"
                    value={raffleForm.draw_date}
                    onChange={(event) =>
                      setRaffleForm((current) => ({ ...current, draw_date: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Estado">
                  <select
                    className="field-input"
                    value={raffleForm.status}
                    onChange={(event) =>
                      setRaffleForm((current) => ({ ...current, status: event.target.value }))
                    }
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
                    className="field-input"
                    value={raffleForm.description}
                    onChange={(event) =>
                      setRaffleForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
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
              <button type="submit" disabled={saving} className="btn-primary mt-6">
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
                    <StatusBadge tone={selectedRaffle.status}>
                      {selectedRaffle.status}
                    </StatusBadge>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field label="Titulo">
                      <input
                        className="field-input"
                        value={selectedRaffle.title || ''}
                        onChange={(event) =>
                          setSelectedRaffle((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Premio">
                      <input
                        className="field-input"
                        value={selectedRaffle.prize || ''}
                        onChange={(event) =>
                          setSelectedRaffle((current) => ({
                            ...current,
                            prize: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Precio por numero">
                      <input
                        type="number"
                        min="0"
                        className="field-input"
                        value={selectedRaffle.price_per_number || ''}
                        onChange={(event) =>
                          setSelectedRaffle((current) => ({
                            ...current,
                            price_per_number: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Fecha sorteo">
                      <input
                        type="date"
                        className="field-input"
                        value={selectedRaffle.draw_date || ''}
                        onChange={(event) =>
                          setSelectedRaffle((current) => ({
                            ...current,
                            draw_date: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Estado">
                      <select
                        className="field-input"
                        value={selectedRaffle.status}
                        onChange={(event) =>
                          setSelectedRaffle((current) => ({
                            ...current,
                            status: event.target.value,
                          }))
                        }
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
                        className="field-input"
                        value={selectedRaffle.description || ''}
                        onChange={(event) =>
                          setSelectedRaffle((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard label="Total" value={summary.total} />
                    <SummaryCard label="Pagados" value={summary.paidCount} />
                    <SummaryCard label="Disponibles" value={summary.availableCount} />
                    <SummaryCard
                      label="Ingreso pagado"
                      value={formatCurrency(summary.paidRevenue)}
                    />
                  </div>

                  <button type="submit" disabled={saving} className="btn-primary mt-6">
                    {saving ? saveLabel || 'Guardando...' : 'Guardar cambios de la rifa'}
                  </button>
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
                    className="btn-primary mt-6"
                  >
                    {saving ? saveLabel || 'Guardando...' : 'Guardar imagenes'}
                  </button>
                </div>

                <div className="admin-panel p-6">
                  <div className="flex flex-wrap gap-2">
                    {['all', ...raffleNumberStatuses].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFilter(status)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          filter === status
                            ? 'bg-slate-700 text-white'
                            : 'border border-dashed border-sand bg-white/80 text-slate-600'
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
                      <button type="submit" className="btn-primary md:col-span-2">
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

const stateStyles = {
  available: 'bg-white text-slate-700 border-sand/60',
  reserved: 'bg-sun text-slate-700 border-yellow-200',
  paid: 'bg-sage text-slate-700 border-emerald-200',
  winner: 'bg-rose text-slate-700 border-rose-200 ring-2 ring-white/80',
}

function resetPreviewUrls(previews) {
  previews.forEach((preview) => URL.revokeObjectURL(preview))
}
