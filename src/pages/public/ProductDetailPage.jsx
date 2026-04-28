import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import ProductGallery from '../../components/public/ProductGallery'
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

  return (
    <section className="page-section pt-16">
      <Link to="/catalogo" className="btn-secondary mb-6">
        Volver al catalogo
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <ProductGallery
          product={product}
          selectedImage={selectedImage}
          onSelectImage={setSelectedImage}
        />

        <div className="space-y-5">
          <div className="card-soft p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
              {product.category?.name || 'Coleccion Cataela'}
            </p>
            <PageHeading
              title={product.name}
              description="Una pieza artesanal creada con detalle, aroma y calidez para acompanar momentos especiales."
            />

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-dashed border-sageDeep/70 bg-white px-5 py-2 text-sm font-semibold text-slate-700">
                {formatCurrency(product.price)}
              </span>
              <span className="rounded-full border border-dashed border-mist/55 bg-mist/10 px-5 py-2 text-sm font-semibold text-slate-600">
                Hecho a mano en Popayan
              </span>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-dashed border-roseDeep/70 bg-white/80 p-5">
              <p className="text-sm leading-8 text-slate-600">{product.description}</p>
            </div>

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

          <div className="card-dashed-green p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Detalles del producto
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DetailItem label="Categoria" value={product.category?.name || 'Cataela'} />
              <DetailItem label="Precio" value={formatCurrency(product.price)} />
              <DetailItem
                label="Galeria"
                value={product.gallery?.length ? `${product.gallery.length + 1} imagenes` : 'Imagen principal'}
              />
              <DetailItem label="Compra" value="Atencion directa por WhatsApp" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-mist/45 bg-white/75 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  )
}
