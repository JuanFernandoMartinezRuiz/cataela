const colorMap = {
  active: 'border border-sageDeep/80 bg-sage text-slate-700',
  inactive: 'border border-sand/60 bg-sand/35 text-slate-700',
  available: 'border border-mist/50 bg-mist/18 text-slate-700',
  reserved: 'border border-sunDeep/90 bg-sun/72 text-slate-700',
  paid: 'border border-sageDeep/80 bg-sage text-slate-700',
  winner: 'border border-roseDeep/80 bg-rose/60 text-slate-700',
  draft: 'border border-sand/60 bg-sand/35 text-slate-700',
  closed: 'border border-slate-200 bg-slate-100 text-slate-700',
  completed: 'border border-sageDeep/80 bg-sage text-slate-700',
  pending: 'border border-sunDeep/90 bg-sun/72 text-slate-700',
  partial: 'border border-sand/60 bg-petal text-slate-700',
  preparing: 'border border-mistDeep/70 bg-mist/18 text-slate-700',
  ready: 'border border-roseDeep/80 bg-rose/60 text-slate-700',
  delivered: 'border border-sageDeep/80 bg-sage text-slate-700',
  cancelled: 'border border-dangerDeep/80 bg-danger/45 text-slate-700',
}

export default function StatusBadge({ children, tone = 'inactive' }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${colorMap[tone] || colorMap.inactive}`}
    >
      {children}
    </span>
  )
}
