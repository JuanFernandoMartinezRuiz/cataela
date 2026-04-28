import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import ProductForm from '../../components/admin/ProductForm'
import { useToast } from '../../providers/ToastProvider'
import { createCategory, fetchCategories } from '../../services/categoryService'
import {
  deleteProductImage,
  deleteStoredAsset,
  deleteStoredAssetByPath,
  uploadGalleryImages,
  uploadMainProductImage,
  uploadMainProductImageForDraft,
} from '../../services/imageService'
import {
  createProduct,
  fetchProductById,
  updateProduct,
} from '../../services/productService'
import { slugify } from '../../utils/slugify'

export default function AdminProductFormPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const [categories, setCategories] = useState([])
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState('')
  const [warning, setWarning] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadForm() {
      try {
        const [categoryRows, productRow] = await Promise.all([
          fetchCategories(),
          isEditing ? fetchProductById(id) : Promise.resolve(null),
        ])

        if (!active) {
          return
        }

        setCategories(categoryRows)
        setProduct(productRow)
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'No fue posible cargar el formulario.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadForm()

    return () => {
      active = false
    }
  }, [id, isEditing])

  useEffect(() => {
    if (location.state?.warning) {
      setWarning(location.state.warning)
      showToast({
        title: 'Producto guardado',
        description: location.state.warning,
        tone: 'warning',
      })
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate, showToast])

  async function handleSubmit({ values, mainImageFile, galleryFiles }) {
    setSaving(true)
    setSaveLabel('')
    setWarning('')
    setError('')

    try {
      const payload = {
        name: values.name.trim(),
        slug: slugify(values.name),
        description: values.description.trim(),
        price: Number(values.price),
        category_id: values.categoryId,
        image_position_x: Number(values.imagePositionX ?? 50),
        image_position_y: Number(values.imagePositionY ?? 50),
        image_zoom: Number(values.imageZoom ?? 1),
        is_active: values.isActive,
      }

      if (isEditing) {
        setSaveLabel('Guardando producto...')
        let updatedProduct = await updateProduct(id, payload)

        if (mainImageFile) {
          let newMainImageUrl = null

          try {
            setSaveLabel('Subiendo imagen...')
            newMainImageUrl = await uploadMainProductImage(updatedProduct.id, mainImageFile)
            setSaveLabel('Guardando producto...')
            updatedProduct = await updateProduct(updatedProduct.id, {
              main_image_url: newMainImageUrl,
            })
          } catch (imageUpdateError) {
            if (newMainImageUrl) {
              try {
                await deleteStoredAsset(newMainImageUrl)
              } catch {
                // Best-effort cleanup for replaced main image uploads.
              }
            }

            throw imageUpdateError
          }
        }

        if (galleryFiles.length) {
          try {
            setSaveLabel('Guardando producto...')
            await uploadGalleryImages(
              updatedProduct.id,
              galleryFiles,
              updatedProduct.gallery?.length || 0,
            )
          } catch {
            setWarning(
              'El producto se guardo, pero una o mas imagenes adicionales no se pudieron subir.',
            )
            showToast({
              title: 'Producto actualizado',
              description:
                'El producto se guardo, pero una o mas imagenes adicionales no se pudieron subir.',
              tone: 'warning',
            })
            const refreshedProduct = await fetchProductById(id)
            setProduct(refreshedProduct)
            return
          }
        }

        showToast({
          title: 'Producto actualizado',
          description: 'Los cambios se guardaron correctamente.',
          tone: 'success',
        })
        navigate('/admin/productos')
        return
      }

      let uploadedMainImage = null
      let savedProduct = null

      if (mainImageFile) {
        try {
          setSaveLabel('Subiendo imagen...')
          uploadedMainImage = await uploadMainProductImageForDraft({
            productName: values.name,
            file: mainImageFile,
          })
        } catch {
          throw new Error(
            'No fue posible subir la foto principal. El producto no se guardo.',
          )
        }
      }

      try {
        setSaveLabel('Guardando producto...')
        savedProduct = await createProduct({
          ...payload,
          main_image_url: uploadedMainImage?.publicUrl || null,
        })
      } catch (createError) {
        if (uploadedMainImage?.storagePath) {
          try {
            await deleteStoredAssetByPath(uploadedMainImage.storagePath)
          } catch {
            // Best-effort cleanup for orphaned uploads.
          }
        }
        throw createError
      }

      if (galleryFiles.length) {
        try {
          await uploadGalleryImages(savedProduct.id, galleryFiles, 0)
        } catch {
          setWarning(
            'El producto principal se guardo correctamente, pero una o mas imagenes adicionales no se pudieron subir.',
          )
          setProduct(savedProduct)
          navigate(`/admin/productos/${savedProduct.id}`, {
            state: {
              warning:
                'El producto principal se guardo correctamente, pero una o mas imagenes adicionales no se pudieron subir.',
            },
          })
          return
        }
      }

      showToast({
        title: 'Producto creado correctamente',
        description: 'Ya puedes verlo y seguir editandolo desde el panel.',
        tone: 'success',
      })
      navigate('/admin/productos')
    } catch (submitError) {
      setError(submitError.message || 'No fue posible guardar el producto.')
      showToast({
        title: 'Error al guardar',
        description: submitError.message || 'Revisa los campos e intenta nuevamente.',
        tone: 'error',
      })
      throw submitError
    } finally {
      setSaving(false)
      setSaveLabel('')
    }
  }

  async function handleDeleteImage(image) {
    try {
      await deleteProductImage(image)
      const refreshedProduct = await fetchProductById(id)
      setProduct(refreshedProduct)
      showToast({
        title: 'Elemento eliminado',
        description: 'La imagen se elimino correctamente.',
        tone: 'success',
      })
    } catch (deleteError) {
      setError(deleteError.message || 'No fue posible eliminar la imagen.')
      showToast({
        title: 'Error al eliminar',
        description: deleteError.message || 'Intenta nuevamente.',
        tone: 'error',
      })
    }
  }

  async function handleCreateCategory(name) {
    try {
      const category = await createCategory({ name })
      setCategories((current) =>
        [...current, category].sort((left, right) =>
          left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }),
        ),
      )
      showToast({
        title: 'Categoria creada',
        description: 'Ya puedes usarla en este producto.',
        tone: 'success',
      })
      return category
    } catch (createError) {
      showToast({
        title: 'Error al guardar',
        description: createError.message || 'No fue posible crear la categoria.',
        tone: 'error',
      })
      throw createError
    }
  }

  return (
    <>
      <div className="admin-panel p-6 md:p-8">
        <PageHeading
          eyebrow="Productos"
          title={isEditing ? 'Editar producto' : 'Crear producto'}
          description="Guarda informacion base en Supabase Database y sube imagenes a Supabase Storage."
        />
      </div>

      {loading ? <LoadingState label="Cargando formulario..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading ? (
        <ProductForm
          categories={categories}
          initialValues={product}
          existingGallery={product?.gallery ?? []}
          loading={loading}
          saving={saving}
          saveLabel={saveLabel}
          warning={warning}
          onSubmit={handleSubmit}
          onDeleteImage={handleDeleteImage}
          onCreateCategory={handleCreateCategory}
        />
      ) : null}
    </>
  )
}
