import { Link } from 'react-router-dom'
import { buildWhatsAppProductLink, formatCurrency, truncateText } from '../../utils/formatters'
import ImagePlaceholder from '../common/ImagePlaceholder'

export default function ProductCard({ product }) {
  return (
    <article className="card-dashed overflow-hidden p-4 transition hover:-translate-y-1 hover:bg-white">
      {product.main_image_url ? (
        <img
          src={product.main_image_url}
          alt={product.name}
          className="h-64 w-full rounded-[1.5rem] object-cover"
        />
      ) : (
        <ImagePlaceholder label={product.name} className="h-64 w-full" />
      )}

      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              {product.category?.name || 'Cataela'}
            </p>
            <h3 className="mt-2 font-display text-3xl text-slate-700">{product.name}</h3>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            {formatCurrency(product.price)}
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          {truncateText(product.description)}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to={`/producto/${product.slug}`} className="btn-secondary">
            Ver detalle
          </Link>
          <a
            href={buildWhatsAppProductLink(product)}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            Pedir por WhatsApp
          </a>
        </div>
      </div>
    </article>
  )
}
