import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import StatusBadge from '../../components/common/StatusBadge'
import { deleteProduct, fetchAdminProducts } from '../../services/productService'
import { deleteProductAssets } from '../../services/imageService'
import { formatCurrency, formatDate } from '../../utils/formatters'

export default function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      setLoading(true)
      setError('')
      const rows = await fetchAdminProducts()
      setProducts(rows)
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar los productos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(`Eliminar ${product.name}?`)
    if (!confirmed) {
      return
    }

    try {
      await deleteProductAssets(product)
      await deleteProduct(product.id)
      await loadProducts()
    } catch (deleteError) {
      setError(deleteError.message || 'No fue posible eliminar el producto.')
    }
  }

  return (
    <>
      <div className="admin-panel p-6 md:p-8">
        <PageHeading
          eyebrow="Productos"
          title="Catalogo administrable"
          description="Crea, edita o elimina productos sin tocar codigo. Las imagenes se suben a Supabase Storage."
          actions={
            <Link to="/admin/productos/nuevo" className="btn-primary">
              Crear producto
            </Link>
          }
        />
      </div>

      {loading ? <LoadingState label="Cargando productos..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error ? (
        <div className="admin-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/80 text-slate-500">
                <tr>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Precio</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Creado</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-sand/30">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-700">{product.name}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          /producto/{product.slug}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{product.category?.name || 'Sin categoria'}</td>
                    <td className="px-6 py-4">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge tone={product.is_active ? 'active' : 'inactive'}>
                        {product.is_active ? 'Activo' : 'Inactivo'}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4">{formatDate(product.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/admin/productos/${product.id}`} className="btn-secondary">
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          className="btn-ghost"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  )
}
