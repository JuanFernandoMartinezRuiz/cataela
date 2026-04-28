import { Link } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState'

export default function NotFoundPage() {
  return (
    <div className="app-shell flex items-center justify-center px-5">
      <div className="page-floral pointer-events-none" />
      <div className="w-full max-w-2xl">
        <EmptyState
          title="No encontramos esta pagina"
          description="Revisa la ruta o vuelve al inicio para seguir navegando el catalogo."
          action={
            <Link to="/" className="btn-primary">
              Ir al inicio
            </Link>
          }
        />
      </div>
    </div>
  )
}
