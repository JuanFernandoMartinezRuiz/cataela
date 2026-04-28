import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CategoryFilter from '../../components/public/CategoryFilter'
import ProductGrid from '../../components/public/ProductGrid'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import { fetchCategories } from '../../services/categoryService'
import { fetchPublicProducts } from '../../services/productService'

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const activeCategory = searchParams.get('categoria') || 'all'

  useEffect(() => {
    let active = true

    async function loadCatalog() {
      try {
        const [categoryRows, productRows] = await Promise.all([
          fetchCategories(),
          fetchPublicProducts(),
        ])

        if (!active) {
          return
        }

        setCategories(categoryRows)
        setProducts(productRows)
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'No fue posible cargar el catalogo.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadCatalog()

    return () => {
      active = false
    }
  }, [])

  const visibleProducts =
    activeCategory === 'all'
      ? products
      : products.filter((product) => product.category?.slug === activeCategory)

  function handleCategoryChange(nextCategory) {
    if (nextCategory === 'all') {
      setSearchParams({})
      return
    }

    setSearchParams({ categoria: nextCategory })
  }

  return (
    <section className="page-section pt-16">
      <div className="card-soft p-6 md:p-8">
        <PageHeading
          eyebrow="Catalogo"
          title="Productos activos desde Supabase"
          description="Filtra por categoria y revisa cada pieza con su detalle, galeria e informacion directa por WhatsApp."
        />

        <div className="mt-8">
          <CategoryFilter
            categories={categories}
            currentCategory={activeCategory}
            onChange={handleCategoryChange}
          />
        </div>
      </div>

      <div className="mt-8">
        {loading ? <LoadingState label="Cargando catalogo..." /> : null}
        {!loading && error ? <ErrorState message={error} /> : null}
        {!loading && !error && !visibleProducts.length ? (
          <EmptyState
            title="No hay productos para esta categoria"
            description="Prueba otro filtro o activa productos desde el panel admin."
          />
        ) : null}
        {!loading && !error && visibleProducts.length ? (
          <ProductGrid products={visibleProducts} />
        ) : null}
      </div>
    </section>
  )
}
