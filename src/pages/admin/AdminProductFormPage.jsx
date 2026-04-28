import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import ProductForm from '../../components/admin/ProductForm'
import { fetchCategories } from '../../services/categoryService'
import { deleteProductImage, uploadGalleryImages, uploadMainProductImage } from '../../services/imageService'
import { createProduct, fetchProductById, updateProduct } from '../../services/productService'
import { slugify } from '../../utils/slugify'

export default function AdminProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const [categories, setCategories] = useState([])
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  async function handleSubmit({ values, mainImageFile, galleryFiles }) {
    setSaving(true)

    try {
      const payload = {
        name: values.name.trim(),
        slug: slugify(values.name),
        description: values.description.trim(),
        price: Number(values.price),
        category_id: values.categoryId,
        is_active: values.isActive,
      }

      const savedProduct = isEditing
        ? await updateProduct(id, payload)
        : await createProduct(payload)

      if (mainImageFile) {
        const mainImageUrl = await uploadMainProductImage(savedProduct.id, mainImageFile)
        await updateProduct(savedProduct.id, { main_image_url: mainImageUrl })
      }

      if (galleryFiles.length) {
        await uploadGalleryImages(
          savedProduct.id,
          galleryFiles,
          savedProduct.gallery?.length || 0,
        )
      }

      navigate('/admin/productos')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteImage(image) {
    try {
      await deleteProductImage(image)
      const refreshedProduct = await fetchProductById(id)
      setProduct(refreshedProduct)
    } catch (deleteError) {
      setError(deleteError.message || 'No fue posible eliminar la imagen.')
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
          onSubmit={handleSubmit}
          onDeleteImage={handleDeleteImage}
        />
      ) : null}
    </>
  )
}
