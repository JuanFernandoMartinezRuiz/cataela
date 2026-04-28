import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorState from '../../components/common/ErrorState'
import LoadingState from '../../components/common/LoadingState'
import PageHeading from '../../components/common/PageHeading'
import { fetchAdminProducts } from '../../services/productService'
import { fetchRaffles, fetchActiveRaffle } from '../../services/raffleService'

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        const [products, raffles, activeRaffle] = await Promise.all([
          fetchAdminProducts(),
          fetchRaffles(),
          fetchActiveRaffle(),
        ])

        if (!active) {
          return
        }

        setSummary({
          totalProducts: products.length,
          activeProducts: products.filter((product) => product.is_active).length,
          totalRaffles: raffles.length,
          activeRaffleTitle: activeRaffle?.title || 'Sin rifa activa',
        })
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'No fue posible cargar el dashboard.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <div className="admin-panel p-6 md:p-8">
        <PageHeading
          eyebrow="Dashboard"
          title="Panel de gestion Cataela"
          description="Desde aqui administras productos, imagenes, rifas y visibilidad publica del sitio."
          actions={
            <>
              <Link to="/admin/productos/nuevo" className="btn-primary">
                Nuevo producto
              </Link>
              <Link to="/admin/rifas" className="btn-secondary">
                Gestionar rifas
              </Link>
            </>
          }
        />
      </div>

      {loading ? <LoadingState label="Cargando dashboard..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && summary ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Productos" value={summary.totalProducts} />
          <MetricCard label="Activos" value={summary.activeProducts} />
          <MetricCard label="Rifas" value={summary.totalRaffles} />
          <MetricCard label="Rifa activa" value={summary.activeRaffleTitle} compact />
        </div>
      ) : null}
    </>
  )
}

function MetricCard({ label, value, compact = false }) {
  return (
    <div className="admin-panel p-6">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-3 font-display text-slate-700 ${compact ? 'text-3xl' : 'text-5xl'}`}>
        {value}
      </p>
    </div>
  )
}
