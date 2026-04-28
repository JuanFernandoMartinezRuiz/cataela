import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import ActiveRaffleSection from '../../components/public/ActiveRaffleSection'
import BrandStorySection from '../../components/public/BrandStorySection'
import ContactSection from '../../components/public/ContactSection'
import CustomOrdersSection from '../../components/public/CustomOrdersSection'
import HeroSection from '../../components/public/HeroSection'
import ProductGrid from '../../components/public/ProductGrid'
import { fetchPublicProducts } from '../../services/productService'

export default function HomePage() {
  const { activeRaffle } = useOutletContext()
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadPage() {
      try {
        const products = await fetchPublicProducts()

        if (!active) {
          return
        }

        setFeaturedProducts(products.slice(0, 3))
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'No fue posible cargar la pagina.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadPage()

    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <HeroSection />
      <BrandStorySection />

      <section className="page-section">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <PageHeading
            eyebrow="Catalogo"
            title="Favoritos del momento"
            description="Productos activos conectados con Supabase para que el catalogo siempre este actualizado."
          />
          <Link to="/catalogo" className="btn-secondary">
            Ver catalogo completo
          </Link>
        </div>

        {loading ? <LoadingState label="Cargando productos..." /> : null}
        {!loading && error ? <ErrorState message={error} /> : null}
        {!loading && !error && featuredProducts.length ? (
          <ProductGrid products={featuredProducts} />
        ) : null}
      </section>

      {!loading && !error && activeRaffle ? <ActiveRaffleSection raffle={activeRaffle} /> : null}
      <CustomOrdersSection />
      <ContactSection />
    </>
  )
}
