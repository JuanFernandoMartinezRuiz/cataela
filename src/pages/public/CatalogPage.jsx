import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CatalogSortSelect from '../../components/public/CatalogSortSelect'
import CategoryFilter from '../../components/public/CategoryFilter'
import ProductGrid from '../../components/public/ProductGrid'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import { fetchCategories } from '../../services/categoryService'
import { fetchPublicProducts } from '../../services/productService'

const sortOptions = [
  { value: 'newest', label: 'Mas nuevos' },
  { value: 'price-asc', label: 'Precio menor a mayor' },
  { value: 'price-desc', label: 'Precio mayor a menor' },
  { value: 'name-asc', label: 'Nombre A-Z' },
]

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const activeCategory = searchParams.get('categoria') || 'all'
  const sortOrder = searchParams.get('orden') || 'newest'

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

  const visibleProducts = sortProducts(
    (
      activeCategory === 'all'
        ? products
        : products.filter((product) => product.category?.slug === activeCategory)
    ).slice(),
    sortOrder,
  )

  function handleCategoryChange(nextCategory) {
    const nextParams = new URLSearchParams(searchParams)

    if (nextCategory === 'all') {
      nextParams.delete('categoria')
    } else {
      nextParams.set('categoria', nextCategory)
    }

    setSearchParams(nextParams)
  }

  function handleSortChange(nextSort) {
    const nextParams = new URLSearchParams(searchParams)

    if (nextSort === 'newest') {
      nextParams.delete('orden')
    } else {
      nextParams.set('orden', nextSort)
    }

    setSearchParams(nextParams)
  }

  return (
    <section className="page-section pt-16">
      <div className="card-soft p-6 md:p-8">
        <PageHeading
          eyebrow="Catalogo"
          title="Descubre nuestras velas disponibles"
          description="Explora el catalogo activo de Cataela, filtra por categoria y encuentra la pieza ideal para regalar, decorar o iluminar un momento especial."
        />

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_280px] lg:items-start">
          <div className="card-dashed-rose p-4">
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-500">
              Categorias
            </p>
            <CategoryFilter
              categories={categories}
              currentCategory={activeCategory}
              onChange={handleCategoryChange}
            />
          </div>

          <CatalogSortSelect
            value={sortOrder}
            options={sortOptions}
            onChange={handleSortChange}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {visibleProducts.length} producto{visibleProducts.length === 1 ? '' : 's'} encontrado
            {visibleProducts.length === 1 ? '' : 's'}.
          </p>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
            {activeCategory === 'all'
              ? 'Vista completa'
              : categories.find((category) => category.slug === activeCategory)?.name ||
                'Categoria'}
          </p>
        </div>
      </div>

      <div className="mt-8">
        {loading ? <LoadingState label="Cargando catalogo..." /> : null}
        {!loading && error ? <ErrorState message={error} /> : null}
        {!loading && !error && !visibleProducts.length ? (
          <EmptyState
            title={
              products.length
                ? 'No hay productos en esta categoria por ahora.'
                : 'Pronto encontraras aqui nuestras velas disponibles.'
            }
            description={
              products.length
                ? 'Prueba otra categoria o revisa de nuevo mas tarde para descubrir nuevas piezas.'
                : 'Estamos preparando el catalogo para mostrarte nuestras velas artesanales muy pronto.'
            }
          />
        ) : null}
        {!loading && !error && visibleProducts.length ? (
          <ProductGrid products={visibleProducts} />
        ) : null}
      </div>
    </section>
  )
}

function sortProducts(products, sortOrder) {
  if (sortOrder === 'price-asc') {
    return products.sort((left, right) => Number(left.price || 0) - Number(right.price || 0))
  }

  if (sortOrder === 'price-desc') {
    return products.sort((left, right) => Number(right.price || 0) - Number(left.price || 0))
  }

  if (sortOrder === 'name-asc') {
    return products.sort((left, right) =>
      String(left.name || '').localeCompare(String(right.name || ''), 'es', {
        sensitivity: 'base',
      }),
    )
  }

  return products.sort((left, right) =>
    String(right.created_at || '').localeCompare(String(left.created_at || '')),
  )
}
