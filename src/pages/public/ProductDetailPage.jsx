import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ErrorState from '../../components/common/ErrorState'
import ImagePlaceholder from '../../components/common/ImagePlaceholder'
import LoadingState from '../../components/common/LoadingState'
import StatusBadge from '../../components/common/StatusBadge'
import { fetchProductBySlug } from '../../services/productService'
import { buildWhatsAppProductLink, formatCurrency } from '../../utils/formatters'

export default function ProductDetailPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [selectedImage, setSelectedImage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadProduct() {
      try {
        const productRow = await fetchProductBySlug(slug)
        if (!active) {
          return
        }

        setProduct(productRow)
        setSelectedImage(
          productRow?.main_image_url || productRow?.gallery?.[0]?.image_url || '',
        )
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'No fue posible cargar el producto.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProduct()

    return () => {
      active = false
    }
  }, [slug])

  if (loading) {
    return (
      <section className="page-section pt-16">
        <LoadingState label="Cargando producto..." />
      </section>
    )
  }

  if (error || !product) {
    return (
      <section className="page-section pt-16">
        <ErrorState message={error || 'Producto no encontrado.'} />
      </section>
    )
  }

  const gallery = [
    ...(product.main_image_url ? [{ id: 'main', image_url: product.main_image_url }] : []),
    ...(product.gallery ?? []),
  ]

  return (
    <section className="page-section pt-16">
      <Link to="/catalogo" className="btn-secondary mb-6">
        Volver al catalogo
      </Link>

      <div className="card-soft grid gap-8 p-6 md:p-8 lg:grid-cols-[1fr_0.95fr]">
        <div>
          {selectedImage ? (
            <img
              src={selectedImage}
              alt={product.name}
              className="h-[420px] w-full rounded-[2rem] object-cover"
            />
          ) : (
            <ImagePlaceholder label={product.name} className="h-[420px] w-full" />
          )}

          <div className="mt-4 grid grid-cols-3 gap-3">
            {gallery.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedImage(image.image_url)}
                className="overflow-hidden rounded-[1.25rem] border border-white/70"
              >
                <img src={image.image_url} alt={product.name} className="h-24 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <StatusBadge tone={product.is_active ? 'active' : 'inactive'}>
            {product.is_active ? 'Activo' : 'Inactivo'}
          </StatusBadge>
          <p className="mt-5 text-xs uppercase tracking-[0.35em] text-slate-500">
            {product.category?.name || 'Coleccion Cataela'}
          </p>
          <h1 className="mt-3 font-display text-5xl text-slate-700">{product.name}</h1>
          <p className="mt-4 font-display text-3xl text-slate-700">
            {formatCurrency(product.price)}
          </p>
          <p className="mt-5 text-base leading-8 text-slate-600">{product.description}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={buildWhatsAppProductLink(product)}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              Pedir por WhatsApp
            </a>
            <Link to="/catalogo" className="btn-secondary">
              Seguir viendo catalogo
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
