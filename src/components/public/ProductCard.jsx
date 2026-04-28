import { Link } from 'react-router-dom'
import { buildWhatsAppProductLink, formatCurrency, truncateText } from '../../utils/formatters'
import ImagePlaceholder from '../common/ImagePlaceholder'

export default function ProductCard({ product }) {
  return (
    <article className="group card-dashed-blue overflow-hidden p-4 transition duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-card">
      <div className="overflow-hidden rounded-[1.6rem]">
        {product.main_image_url ? (
          <img
            src={product.main_image_url}
            alt={product.name}
            className="h-64 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <ImagePlaceholder label={product.name} className="h-64 w-full" />
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              {product.category?.name || 'Coleccion Cataela'}
            </p>
            <h3 className="mt-2 font-display text-3xl text-slate-700">{product.name}</h3>
          </div>
          <span className="shrink-0 rounded-full border border-dashed border-sageDeep/70 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            {formatCurrency(product.price)}
          </span>
        </div>

        <p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-500">
          {truncateText(product.description)}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={buildWhatsAppProductLink(product)}
            target="_blank"
            rel="noreferrer"
            className="btn-primary flex-1"
          >
            Pedir por WhatsApp
          </a>
          <Link to={`/producto/${product.slug}`} className="btn-secondary flex-1">
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  )
}
